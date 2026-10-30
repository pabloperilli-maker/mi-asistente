"use strict";

const $ = (id) => document.getElementById(id);
let filtro = "pendiente";

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...opts });
  if (res.status === 401) {
    mostrarLogin();
    throw new Error("No autorizado");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

function mostrarLogin() {
  $("login").hidden = false;
  $("panel").hidden = true;
}

function el(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const h of hijos) if (h != null) e.append(h);
  return e;
}

const fecha = (iso) => (iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "-");

async function cargar() {
  const lista = $("lista");
  lista.textContent = "Cargando…";
  let pedidos;
  try {
    pedidos = await api("/api/admin/pedidos" + (filtro === "asesoramiento" ? "" : "?estado=" + filtro));
  } catch {
    return;
  }
  if (filtro === "asesoramiento") pedidos = pedidos.filter((p) => p.asesoramiento);
  $("login").hidden = true;
  $("panel").hidden = false;
  lista.textContent = "";
  if (!pedidos.length) return lista.append(el("p", { class: "nota" }, "No hay pedidos en esta lista."));

  for (const p of pedidos) {
    const acciones = el("div", { class: "acciones" });
    if (p.tieneComprobante) acciones.append(el("a", { href: `/api/admin/pedidos/${p.id}/comprobante`, target: "_blank" }, "Ver comprobante"));
    if (p.tieneDocumento) acciones.append(el("a", { href: `/api/admin/pedidos/${p.id}/documento`, target: "_blank" }, "Ver documento"));
    if (p.estado !== "aprobado")
      acciones.append(el("button", { class: "btn primario", onclick: () => accion(p, "aprobar") }, "Aprobar"));
    if (p.estado === "pendiente")
      acciones.append(el("button", { class: "btn secundario", onclick: () => accion(p, "rechazar") }, "Rechazar"));
    acciones.append(el("button", { class: "btn-link peligro", onclick: () => borrar(p) }, "Eliminar"));

    let ases = null;
    if (p.asesoramiento) {
      const a = p.asesoramiento;
      ases = el("div", { class: "tarjeta info" },
        el("p", {}, el("strong", {}, "Asesoramiento integral: "), `${a.nombre} · ${a.whatsapp || ""} ${a.email || ""}`),
        el("p", {}, "Horario: " + (a.horario || "-")),
        el("pre", {}, a.resumen));
    }

    lista.append(el("div", { class: "pedido" },
      el("div", { class: "fila" },
        el("span", { class: "codigo" }, p.codigo),
        el("span", { class: "estado" }, p.estado),
        el("span", {}, "Urgencia: " + p.urgencia)),
      el("div", { class: "fila nota" },
        el("span", {}, "Creado: " + fecha(p.creado)),
        el("span", {}, "Pago informado: " + fecha(p.pagoInformado)),
        el("span", {}, "Contacto: " + (p.contacto || "-"))),
      el("pre", {}, p.adelanto),
      ases,
      acciones));
  }
}

async function accion(p, tipo) {
  if (tipo === "aprobar" && !confirm(`¿Confirmás que recibiste la transferencia con código ${p.codigo}?`)) return;
  try {
    await api(`/api/admin/pedidos/${p.id}/${tipo}`, { method: "POST" });
  } catch (e) {
    alert(e.message);
  }
  cargar();
}

async function borrar(p) {
  if (!confirm(`¿Eliminar definitivamente el pedido ${p.codigo} con sus archivos?`)) return;
  try {
    await api(`/api/admin/pedidos/${p.id}`, { method: "DELETE" });
  } catch (e) {
    alert(e.message);
  }
  cargar();
}

$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("err-login");
  err.hidden = true;
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: e.target.password.value }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    err.textContent = d.error || "No se pudo ingresar.";
    err.hidden = false;
    return;
  }
  e.target.reset();
  cargar();
});

$("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  filtro = b.dataset.estado;
  for (const x of $("tabs").children) x.classList.toggle("activo", x === b);
  cargar();
});

$("btn-salir").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  mostrarLogin();
});

cargar();
