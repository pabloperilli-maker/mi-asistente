// Almacenamiento simple en disco: un JSON con los pedidos y una carpeta con archivos.
// Suficiente para empezar con bajo volumen. Para escalar, reemplazar por una base de datos.

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const FILES_DIR = path.join(DATA_DIR, "archivos");
const DB_FILE = path.join(DATA_DIR, "pedidos.json");

fs.mkdirSync(FILES_DIR, { recursive: true, mode: 0o700 });

let pedidos = {};
try {
  pedidos = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
} catch {
  pedidos = {};
}

function persistir() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(pedidos), { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}

export const get = (id) => pedidos[id] || null;
export const all = () => Object.values(pedidos);
export const findByCodigo = (codigo) => all().find((p) => p.codigo === codigo) || null;

export function put(p) {
  pedidos[p.id] = p;
  persistir();
}

export function remove(id) {
  const p = pedidos[id];
  if (!p) return;
  deleteFile(p.archivo);
  deleteFile(p.comprobante);
  delete pedidos[id];
  persistir();
}

export function saveFile(nombre, buffer) {
  fs.writeFileSync(path.join(FILES_DIR, nombre), buffer, { mode: 0o600 });
  return nombre;
}

export function filePath(nombre) {
  return path.join(FILES_DIR, path.basename(nombre));
}

export function deleteFile(nombre) {
  if (!nombre) return;
  try {
    fs.unlinkSync(filePath(nombre));
  } catch {}
}

// Borra documentos y comprobantes con más de `dias` días. Conserva el registro del pedido
// (código, estado, textos) para que el usuario siga viendo su orientación.
export function purgeFilesOlderThan(dias) {
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  let n = 0;
  for (const p of all()) {
    if (Date.parse(p.creado) >= limite) continue;
    for (const campo of ["archivo", "comprobante"]) {
      if (p[campo]) {
        deleteFile(p[campo]);
        p[campo] = null;
        n++;
      }
    }
  }
  if (n) persistir();
  return n;
}
