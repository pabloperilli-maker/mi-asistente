# Publicar en Render — paso a paso

Tiempo estimado: 15 minutos. No hace falta saber programar.

## Antes de empezar: usar la rama correcta

El código está en la rama `claude/orientacion-legal-express`. Tenés dos opciones:
- **Recomendado:** pasarlo a `main` (pedímelo y abro el PR, o lo aprobás vos en GitHub).
- O elegir esa rama en Render en el paso 3.

## Paso 1 — Crear la cuenta
1. Entrá a https://render.com y tocá **Get Started**.
2. Registrate con **GitHub** (así Render ve tu repo `mi-asistente`).
3. Si pregunta a qué repos dar acceso, elegí `mi-asistente`.

## Paso 2 — Crear el servicio desde el archivo de configuración
1. En el panel de Render: **New +** → **Blueprint**.
2. Elegí el repo `mi-asistente` (y la rama, si no lo pasaste a `main`).
3. Render lee `render.yaml` y muestra un servicio llamado `orientacion-legal`.
4. Te va a pedir completar algunas variables:
   - `ADMIN_PASSWORD`: la contraseña para tu tablero. Usá una larga.
   - `PAGO_ALIAS`, `PAGO_TITULAR`: tus datos bancarios.
   - `ANTHROPIC_API_KEY` y `NOTIFY_WEBHOOK_URL`: dejalas vacías por ahora.
5. Tocá **Apply** / **Create**. Esperá unos minutos hasta que diga **Live**.

> Si el Blueprint da error, se puede crear a mano: **New +** → **Web Service** → repo `mi-asistente`,
> *Root Directory* `orientacion-legal`, *Build Command* `npm ci`, *Start Command* `npm start`,
> plan *Free*, y cargar las variables de `.env.example` en la pestaña **Environment**.

## Paso 3 — Abrirla
Render te da una dirección tipo `https://orientacion-legal-xxxx.onrender.com`.
- La app: esa dirección.
- **Tu tablero: esa dirección + `/admin`** (guardala en favoritos).

Probá el circuito completo desde el celular: subir una foto cualquiera → pagar (subir cualquier imagen como comprobante) → aprobar desde el tablero → ver la orientación completa.
Mientras `MOCK_IA=1`, la orientación es un texto de ejemplo.

## Paso 4 — Activar la IA real
1. Creá una API key en https://console.anthropic.com (requiere cargar crédito).
2. En Render → tu servicio → **Environment**:
   - cargá `ANTHROPIC_API_KEY`,
   - **borrá** `MOCK_IA`,
   - guardá. Render reinicia solo.

## Paso 5 (opcional) — Avisos al celular
1. Instalá la app **ntfy** en el celular y suscribite a un tema con nombre difícil de adivinar
   (ej. `ole-pagos-8f3k2q9z`).
2. En Render → **Environment**: `NOTIFY_WEBHOOK_URL` = `https://ntfy.sh/ole-pagos-8f3k2q9z`.

## Importante antes de cobrar de verdad
- **Plan gratuito = sólo para probar.** Hasta donde sé (verificalo en la web de Render), el servicio
  gratis se "duerme" tras un rato sin uso (la primera visita tarda) y **no guarda archivos entre
  reinicios**: los pedidos y comprobantes se pueden perder.
- Para uso real: pasar a un plan pago, agregar un **Disk** (Settings → Disks, ej. montado en
  `/var/data`) y cargar la variable `DATA_DIR=/var/data`.
- Completar y revisar Términos y Privacidad (`public/terminos.html`, `public/privacidad.html`).
