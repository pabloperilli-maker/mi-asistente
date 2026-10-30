"use strict";

const $ = (id) => document.getElementById(id);
const KEY = "ole_pedido";
let pedido = null; // vista que devuelve el servidor
let cred = null;   // { id, token } — guardado en el navegador para volver a ver el pedido

const pesos = (n) => "$" + Number(n).toLocaleString("es-AR");

function mostrarVista(nombre) {
  for (const v of document.querySelectorAll(".vista")) v.hidden = v.id !== "v-" + nombre;
  window.scrollTo(0, 0);
}

function error(id, msg) {
  const el = $(id);
  el.textContent = msg || "";
  el.hidden = !msg;
}

function guardarCred(c) {
  cred = c;
  try { c ? localStorage.setItem(KEY, JSON.stringify(c)) : localStorage.removeItem(KEY); } catch {}
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cred) headers["x-pedido-token"] = cred.token;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Algo salió mal. Probá de nuevo.");
  return data;
}

// ---------- Inicio ----------

$("acepto").addEventListener("change", (e) => ($("btn-subir").disabled = !e.target.checked));
$("btn-subir").addEventListener("click", () => $("archivo").click());

$("archivo").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return error("err-inicio", "El archivo supera 10 MB.");
  error("err-inicio", "");
  mostrarVista("analizando");

  const fd = new FormData();
  fd.append("acepta", String($("acepto").checked));
  fd.append("archivo", file);
  try {
    guardarCred(null);
    const r = await api("/api/analizar", { method: "POST", body: fd });
    guardarCred({ id: r.pedido.id, token: r.token });
    render(r.pedido);
  } catch (err) {
    mostrarVista("inicio");
    error("err-inicio", err.message);
  }
});

// ---------- Resultado ----------

function render(p) {
  pedido = p;
  mostrarVista("resultado");

  $("adelanto").textContent = p.adelanto;
  const chip = $("urgencia");
  chip.hidden = !p.valido;
  chip.textContent = "Urgencia: " + p.urgencia;
  chip.className = "chip u-" + (p.urgencia || "").toLowerCase();

  for (const el of document.querySelectorAll(".monto")) el.textContent = pesos(p.pago.monto);
  $("p-alias").textContent = p.pago.alias;
  $("p-titular").textContent = p.pago.titular;
  $("p-codigo").textContent = p.pago.codigo;
  $("p-codigo2").textContent = p.pago.codigo;

  const bloques = {
    "bloque-invalido": !p.valido,
    "bloque-bloqueado": p.estado === "sin_pago",
    "bloque-pendiente": p.estado === "pendiente",
    "bloque-rechazado": p.estado === "rechazado",
    "bloque-completa": p.estado === "aprobado",
    "bloque-pago": false,
  };
  for (const [id, visible] of Object.entries(bloques)) $(id).hidden = !visible;

  if (p.estado === "aprobado") {
    $("completa").textContent = p.completa;
    $("form-asesoramiento").hidden = p.asesoramientoEnviado;
    $("ases-ok").hidden = !p.asesoramientoEnviado;
  }
}

function abrirPago() {
  $("bloque-bloqueado").hidden = true;
  $("bloque-rechazado").hidden = true;
  $("bloque-pago").hidden = false;
  $("bloque-pago").scrollIntoView({ behavior: "smooth" });
}
$("btn-pagar").addEventListener("click", abrirPago);
$("btn-reintentar-pago").addEventListener("click", abrirPago);

document.addEventListener("click", async (e) => {
  const copiar = e.target.closest("[data-copiar]");
  if (copiar) {
    try {
      await navigator.clipboard.writeText($(copiar.dataset.copiar).textContent);
      copiar.textContent = "Copiado";
      setTimeout(() => (copiar.textContent = "Copiar"), 1500);
    } catch {}
  }
  if (e.target.closest("[data-accion=nuevo]")) {
    guardarCred(null);
    pedido = null;
    mostrarVista("inicio");
  }
});

$("form-comprobante").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  error("err-pago", "");
  try {
    render(await api(`/api/pedido/${cred.id}/comprobante`, { method: "POST", body: new FormData(e.target) }));
    e.target.reset();
  } catch (err) {
    error("err-pago", err.message);
  } finally {
    btn.disabled = false;
  }
});

async function refrescar() {
  if (!cred) return;
  try {
    render(await api(`/api/pedido/${cred.id}`));
  } catch {
    guardarCred(null);
    mostrarVista("inicio");
  }
}
$("btn-refrescar").addEventListener("click", refrescar);

// Mientras el pago está pendiente, consulta cada 30 s.
setInterval(() => {
  if (pedido && pedido.estado === "pendiente" && !document.hidden) refrescar();
}, 30000);

$("form-asesoramiento").addEventListener("submit", async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  if (!datos.whatsapp && !datos.email) return error("err-ases", "Dejanos al menos un WhatsApp o un email.");
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  error("err-ases", "");
  try {
    await api(`/api/pedido/${cred.id}/asesoramiento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    e.target.hidden = true;
    $("ases-ok").hidden = false;
  } catch (err) {
    error("err-ases", err.message);
  } finally {
    btn.disabled = false;
  }
});

$("btn-eliminar").addEventListener("click", async () => {
  if (!cred || !confirm("Se van a borrar tu documento, el comprobante y la orientación. No se puede deshacer. ¿Continuar?")) return;
  try {
    await api(`/api/pedido/${cred.id}`, { method: "DELETE" });
  } catch {}
  guardarCred(null);
  pedido = null;
  mostrarVista("inicio");
  alert("Listo, borramos tus datos.");
});

// ---------- Arranque: retomar el pedido guardado ----------

try { cred = JSON.parse(localStorage.getItem(KEY)); } catch {}
if (cred) refrescar();
