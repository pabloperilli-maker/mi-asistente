// Orientación Legal Express — servidor.
// Regla clave: la orientación completa vive sólo en el servidor y se entrega
// únicamente cuando el pedido está "aprobado". El adelanto se recorta acá.

import express from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYSTEM_PROMPT, SCHEMA } from "./prompt.js";
import * as db from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CFG = {
  port: Number(process.env.PORT || 3000),
  adminPassword: process.env.ADMIN_PASSWORD || "",
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  alias: process.env.PAGO_ALIAS || "[ALIAS]",
  titular: process.env.PAGO_TITULAR || "[NOMBRE]",
  monto: Number(process.env.PAGO_MONTO || 20000),
  notifyUrl: process.env.NOTIFY_WEBHOOK_URL || "",
  model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
  retentionDays: Number(process.env.RETENCION_DIAS || 30),
  production: process.env.NODE_ENV === "production",
};

if (!process.env.ANTHROPIC_API_KEY && process.env.MOCK_IA !== "1") console.warn("⚠ Falta ANTHROPIC_API_KEY: el análisis va a fallar.");
if (!CFG.adminPassword) console.warn("⚠ Falta ADMIN_PASSWORD: el panel de administrador queda deshabilitado.");
if (!process.env.SESSION_SECRET) console.warn("⚠ Falta SESSION_SECRET: las sesiones de admin se pierden al reiniciar.");

const anthropic = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "50kb" }));

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'none'",
  });
  next();
});

// ---------- Utilidades ----------

const MIME_OK = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, MIME_OK.has(file.mimetype)),
});

function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const arr = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: "Demasiados intentos. Probá de nuevo más tarde." });
    arr.push(now);
    hits.set(req.ip, arr);
    next();
  };
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones
function codigoUnico() {
  for (;;) {
    let c = "";
    for (let i = 0; i < 6; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!db.findByCodigo(c)) return c;
  }
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Recorta el adelanto en el servidor: máximo 3 líneas y 400 caracteres.
function recortarAdelanto(texto) {
  const lineas = String(texto || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 3);
  let out = lineas.join("\n");
  if (out.length > 400) out = out.slice(0, 397).trimEnd() + "…";
  return out;
}

function limpiar(s, max) {
  return String(s ?? "").trim().slice(0, max);
}

async function avisarAdmin(texto) {
  console.log("[AVISO ADMIN]", texto);
  if (!CFG.notifyUrl) return;
  try {
    await fetch(CFG.notifyUrl, { method: "POST", headers: { "Content-Type": "text/plain; charset=utf-8" }, body: texto });
  } catch (e) {
    console.error("No se pudo enviar el aviso al admin:", e.message);
  }
}

// El usuario accede a su pedido con el id + un token secreto que sólo tiene su navegador.
function pedidoDelUsuario(req, res) {
  const p = db.get(req.params.id);
  const token = req.get("x-pedido-token") || "";
  if (!p || !safeEqual(p.tokenHash, crypto.createHash("sha256").update(token).digest("hex"))) {
    res.status(404).json({ error: "Pedido no encontrado." });
    return null;
  }
  return p;
}

// Vista pública de un pedido. La orientación completa sólo se incluye si está aprobado.
function vistaUsuario(p) {
  const v = {
    id: p.id,
    estado: p.estado,
    valido: p.valido,
    adelanto: p.adelanto,
    urgencia: p.urgencia,
    pago: { alias: CFG.alias, titular: CFG.titular, monto: CFG.monto, codigo: p.codigo },
    comprobanteEnviado: Boolean(p.comprobante),
    asesoramientoEnviado: Boolean(p.asesoramiento),
  };
  if (p.estado === "aprobado") v.completa = p.completa;
  return v;
}

// ---------- Análisis con Claude ----------

async function analizarDocumento(buffer, mime) {
  // Modo de prueba local sin consumir la API (MOCK_IA=1).
  if (process.env.MOCK_IA === "1") {
    return {
      es_documento_legal: true,
      adelanto: "Carta documento.\nLa envía Ejemplo S.A.\nTe intima a pagar una deuda.",
      completa: "1. Qué es este documento\n(texto de prueba)\n\nEsta orientación es informativa y no reemplaza el asesoramiento de un abogado.",
      urgencia: "Media",
    };
  }
  const data = buffer.toString("base64");
  const bloque =
    mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mime, data } };

  const response = await anthropic.beta.messages.create({
    model: CFG.model,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [bloque, { type: "text", text: "Analizá este documento y devolvé el JSON con la estructura indicada." }],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("refusal");
  if (response.stop_reason === "max_tokens") throw new Error("max_tokens");
  const texto = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(texto);
}

// ---------- API usuario ----------

app.post("/api/analizar", rateLimiter(6, 60 * 60 * 1000), upload.single("archivo"), async (req, res) => {
  if (req.body.acepta !== "true") return res.status(400).json({ error: "Tenés que aceptar los Términos y la Política de Privacidad." });
  if (!req.file) return res.status(400).json({ error: "Subí una foto (JPG, PNG, WEBP) o un PDF de hasta 10 MB." });

  let r;
  try {
    r = await analizarDocumento(req.file.buffer, req.file.mimetype);
  } catch (e) {
    console.error("Error de análisis:", e?.status || "", e?.message);
    return res.status(502).json({ error: "No pudimos analizar el documento. Probá de nuevo en unos minutos." });
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const id = crypto.randomUUID();
  const ext = req.file.mimetype === "application/pdf" ? "pdf" : req.file.mimetype.split("/")[1];
  const archivo = db.saveFile(`${id}-doc.${ext}`, req.file.buffer);

  const pedido = {
    id,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    codigo: codigoUnico(),
    creado: new Date().toISOString(),
    estado: r.es_documento_legal ? "sin_pago" : "invalido",
    valido: Boolean(r.es_documento_legal),
    adelanto: recortarAdelanto(r.adelanto),
    completa: String(r.completa || ""),
    urgencia: ["Alta", "Media", "Baja"].includes(r.urgencia) ? r.urgencia : "Media",
    archivo,
    archivoMime: req.file.mimetype,
    comprobante: null,
    contacto: null,
    asesoramiento: null,
  };
  db.put(pedido);
  res.json({ token, pedido: vistaUsuario(pedido) });
});

app.get("/api/pedido/:id", (req, res) => {
  const p = pedidoDelUsuario(req, res);
  if (p) res.json(vistaUsuario(p));
});

app.post("/api/pedido/:id/comprobante", rateLimiter(10, 60 * 60 * 1000), upload.single("comprobante"), (req, res) => {
  const p = pedidoDelUsuario(req, res);
  if (!p) return;
  if (!p.valido) return res.status(400).json({ error: "Este documento no se pudo analizar; subí otra foto." });
  if (p.estado === "aprobado") return res.status(400).json({ error: "Este pedido ya está aprobado." });
  if (!req.file) return res.status(400).json({ error: "Subí el comprobante (imagen o PDF, hasta 10 MB)." });
  const contacto = limpiar(req.body.contacto, 120);
  if (contacto.length < 6) return res.status(400).json({ error: "Dejanos un WhatsApp o email para avisarte." });

  if (p.comprobante) db.deleteFile(p.comprobante);
  const ext = req.file.mimetype === "application/pdf" ? "pdf" : req.file.mimetype.split("/")[1];
  p.comprobante = db.saveFile(`${p.id}-comp.${ext}`, req.file.buffer);
  p.comprobanteMime = req.file.mimetype;
  p.contacto = contacto;
  p.estado = "pendiente";
  p.pagoInformado = new Date().toISOString();
  db.put(p);
  avisarAdmin(`Nuevo comprobante: código ${p.codigo} · contacto ${contacto} · urgencia ${p.urgencia}`);
  res.json(vistaUsuario(p));
});

app.post("/api/pedido/:id/asesoramiento", rateLimiter(5, 60 * 60 * 1000), (req, res) => {
  const p = pedidoDelUsuario(req, res);
  if (!p) return;
  if (p.estado !== "aprobado") return res.status(403).json({ error: "Disponible después de aprobado el pago." });
  const b = req.body || {};
  const datos = {
    nombre: limpiar(b.nombre, 100),
    whatsapp: limpiar(b.whatsapp, 40),
    email: limpiar(b.email, 120),
    resumen: limpiar(b.resumen, 2000),
    horario: limpiar(b.horario, 100),
    fecha: new Date().toISOString(),
  };
  if (!datos.nombre || (!datos.whatsapp && !datos.email) || !datos.resumen)
    return res.status(400).json({ error: "Completá nombre, un medio de contacto y el resumen del caso." });
  p.asesoramiento = datos;
  db.put(p);
  avisarAdmin(`Pedido de asesoramiento integral: ${datos.nombre} · ${datos.whatsapp || datos.email} · código ${p.codigo} · horario: ${datos.horario || "-"}`);
  res.json({ ok: true });
});

// Derecho de supresión: el usuario borra su pedido, el documento y el comprobante.
app.delete("/api/pedido/:id", (req, res) => {
  const p = pedidoDelUsuario(req, res);
  if (!p) return;
  db.remove(p.id);
  res.json({ ok: true });
});

// ---------- Admin ----------

const ADMIN_COOKIE = "ole_admin";
const ADMIN_TTL_MS = 8 * 60 * 60 * 1000;

function firmar(valor) {
  return crypto.createHmac("sha256", CFG.sessionSecret).update(valor).digest("base64url");
}
function leerCookie(req, nombre) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${nombre}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function requireAdmin(req, res, next) {
  const c = leerCookie(req, ADMIN_COOKIE);
  if (c) {
    const [exp, sig] = c.split(".");
    if (sig && safeEqual(sig, firmar(exp)) && Number(exp) > Date.now()) return next();
  }
  res.status(401).json({ error: "No autorizado." });
}

app.post("/api/admin/login", rateLimiter(10, 15 * 60 * 1000), (req, res) => {
  if (!CFG.adminPassword) return res.status(503).json({ error: "Panel deshabilitado: falta ADMIN_PASSWORD." });
  if (!safeEqual(req.body?.password || "", CFG.adminPassword)) return res.status(401).json({ error: "Contraseña incorrecta." });
  const exp = String(Date.now() + ADMIN_TTL_MS);
  res.cookie(ADMIN_COOKIE, `${exp}.${firmar(exp)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: CFG.production,
    maxAge: ADMIN_TTL_MS,
    path: "/",
  });
  res.json({ ok: true });
});

app.post("/api/admin/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/pedidos", requireAdmin, (req, res) => {
  const filtro = req.query.estado;
  const lista = db
    .all()
    .filter((p) => (filtro ? p.estado === filtro : p.estado !== "invalido"))
    .sort((a, b) => (b.pagoInformado || b.creado).localeCompare(a.pagoInformado || a.creado))
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      estado: p.estado,
      creado: p.creado,
      pagoInformado: p.pagoInformado || null,
      aprobado: p.aprobado || null,
      contacto: p.contacto,
      urgencia: p.urgencia,
      adelanto: p.adelanto,
      tieneComprobante: Boolean(p.comprobante),
      tieneDocumento: Boolean(p.archivo),
      asesoramiento: p.asesoramiento,
    }));
  res.json(lista);
});

function enviarArchivo(campo, mimeCampo) {
  return (req, res) => {
    const p = db.get(req.params.id);
    if (!p || !p[campo]) return res.status(404).send("No disponible (puede haber sido borrado por antigüedad).");
    res.set("Cache-Control", "no-store");
    res.type(p[mimeCampo]);
    res.sendFile(db.filePath(p[campo]));
  };
}
app.get("/api/admin/pedidos/:id/comprobante", requireAdmin, enviarArchivo("comprobante", "comprobanteMime"));
app.get("/api/admin/pedidos/:id/documento", requireAdmin, enviarArchivo("archivo", "archivoMime"));

app.post("/api/admin/pedidos/:id/aprobar", requireAdmin, (req, res) => {
  const p = db.get(req.params.id);
  if (!p) return res.status(404).json({ error: "Pedido no encontrado." });
  if (!p.valido) return res.status(400).json({ error: "El pedido no tiene una orientación válida." });
  p.estado = "aprobado";
  p.aprobado = new Date().toISOString();
  db.put(p);
  res.json({ ok: true });
});

app.post("/api/admin/pedidos/:id/rechazar", requireAdmin, (req, res) => {
  const p = db.get(req.params.id);
  if (!p) return res.status(404).json({ error: "Pedido no encontrado." });
  p.estado = "rechazado";
  db.put(p);
  res.json({ ok: true });
});

app.delete("/api/admin/pedidos/:id", requireAdmin, (req, res) => {
  db.remove(req.params.id);
  res.json({ ok: true });
});

// ---------- Estáticos ----------

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "El archivo supera 10 MB." : "Archivo inválido." });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno." });
});

// ---------- Borrado automático ----------

function purgar() {
  const n = db.purgeFilesOlderThan(CFG.retentionDays);
  if (n) console.log(`Borrado automático: ${n} archivo(s) con más de ${CFG.retentionDays} días.`);
}
purgar();
setInterval(purgar, 6 * 60 * 60 * 1000).unref();

app.listen(CFG.port, () => console.log(`Orientación Legal Express en http://localhost:${CFG.port}`));
