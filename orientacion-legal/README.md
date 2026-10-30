# Orientación Legal Express (nombre provisorio)

App web para celular: la persona sube una foto o PDF de un documento legal recibido
(carta documento, intimación, cédula, notificación) y recibe una orientación en
lenguaje simple generada con Claude. El adelanto es gratis; la orientación completa
se habilita después de verificar manualmente una transferencia.

**Necesita un servidor Node.** No funciona en GitHub Pages (que sólo sirve archivos
estáticos y no puede guardar la API key ni los pedidos).

## Cómo funciona la seguridad del pago

- Claude responde en el servidor con `{es_documento_legal, adelanto, completa, urgencia}`.
- El servidor recorta el adelanto (máx. 3 líneas / 400 caracteres) y guarda `completa`
  en disco. **El navegador nunca recibe `completa`** hasta que el pedido está `aprobado`
  (ver `vistaUsuario()` en `server.js`).
- Cada pedido tiene un token secreto que sólo conoce el navegador que lo creó; sin él
  no se puede consultar el pedido.
- El panel `/admin` usa contraseña (`ADMIN_PASSWORD`) y una cookie firmada `httpOnly`.

Estados del pedido: `sin_pago` → `pendiente` (subió comprobante) → `aprobado` / `rechazado`.
`invalido` = la imagen no era legible o no era un documento legal (no se cobra).

## Probar localmente

```bash
cd orientacion-legal
npm install
MOCK_IA=1 ADMIN_PASSWORD=prueba npm start      # sin API key, respuesta de ejemplo
# o con la IA real:
ANTHROPIC_API_KEY=sk-ant-... ADMIN_PASSWORD=prueba npm start
```

Abrir http://localhost:3000 y el panel en http://localhost:3000/admin.

## Publicar

Cualquier hosting de Node con disco persistente (Render, Railway, Fly.io, un VPS):

1. Comando de inicio: `npm start` (carpeta raíz: `orientacion-legal`).
2. Cargar las variables secretas de `.env.example` en el panel del hosting.
3. Montar un disco persistente y apuntar `DATA_DIR` a él (si no, los pedidos se
   pierden en cada reinicio).
4. Usar HTTPS (los hostings mencionados lo dan por defecto) y `NODE_ENV=production`.

Avisos al administrador: si se configura `NOTIFY_WEBHOOK_URL`, cada comprobante y cada
pedido de asesoramiento se envía como texto por POST (por ejemplo a un tema de
[ntfy](https://ntfy.sh) para recibirlo como notificación en el celular).

## Datos y privacidad

- Documentos y comprobantes se borran automáticamente a los `RETENCION_DIAS` (30) días.
  El texto de la orientación se conserva para que el usuario la siga viendo.
- El usuario puede borrar todo con "Eliminar mi documento y mis datos".
- `public/terminos.html` y `public/privacidad.html` son **borradores** con campos
  `[ENTRE CORCHETES]` a completar y puntos marcados para revisión.

## Pendientes / limitaciones

- Almacenamiento en un archivo JSON: suficiente para bajo volumen; para escalar, migrar
  a una base de datos.
- El límite de intentos (6 análisis por hora por IP) es en memoria.
- La verificación de pagos es manual.
