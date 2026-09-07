# Mi Agenda de Voz

Agenda personal para registrar tareas por voz o por texto. Al hablar o escribir
algo como *"Recordame presentar el escrito el viernes a las 10"*, la app
interpreta automáticamente el día y la hora, crea la tarea y la ubica en la
lista correspondiente. No usa backend ni envía datos a ningún servidor: todo
se guarda en el `localStorage` del navegador, en el propio dispositivo.

## Funcionalidad

- **Micrófono → tarea automática**: tocás el botón, decís la tarea (podés
  incluir día y hora hablado), y se crea sola con la fecha asignada.
- **Carga manual**: también podés escribir la tarea; el mismo intérprete de
  fecha/hora en español se aplica al texto tipeado.
- **Chips "Fecha y hora" y "Recordatorio"**: para fijar una fecha exacta con
  el selector nativo, o activar aviso de vencimiento, sin depender de lo que
  se haya dicho/escrito.
- **Editar**: tocando el texto de una tarea se abre edición en línea (texto,
  fecha/hora, recordatorio).
- **Marcar como realizada**: el círculo de la izquierda tilda la tarea, que
  desaparece de las listas activas (queda en "Completadas", plegable, por si
  hace falta deshacer o borrar definitivamente).
- **Eliminar**: tacho a la derecha, con opción de "Deshacer" por unos
  segundos.
- **Recordatorios de vencimiento**: cada 30 segundos la app revisa las
  tareas con recordatorio activo. 15 minutos antes de la hora asignada
  dispara una notificación del navegador ("Por vencer") y, si se pasa el
  horario sin completarla, otra ("Tarea vencida"). Las tareas vencidas
  también se destacan visualmente en una sección aparte.
- **Secciones**: Vencidas (si hay), Hoy, Próximas y Completadas.

## Cómo probarla localmente

No requiere instalación. Basta con levantar un servidor estático (el
micrófono y las notificaciones necesitan `http://localhost` o HTTPS, no
funcionan abriendo el archivo con `file://`):

```bash
python3 -m http.server 8000
# abrir http://localhost:8000 en el navegador
```

## Cómo publicarla para usarla desde el celular

El repo incluye un workflow (`.github/workflows/deploy.yml`) que publica el
sitio en GitHub Pages en cada push a `main`. Pasos:

1. Fusioná esta rama a `main` (o hacé el push directo a `main` si preferís).
2. En GitHub: **Settings → Pages → Source → GitHub Actions** (una sola vez).
3. Tras el primer deploy, GitHub te da una URL tipo
   `https://<usuario>.github.io/mi-asistente/`.
4. Abrí esa URL desde el celular (Chrome en Android recomendado) y elegí
   **"Agregar a pantalla de inicio"** para usarla como app.

## Limitaciones a tener en cuenta

- El **dictado por voz** usa la Web Speech API del navegador
  (`SpeechRecognition`). Funciona bien en **Chrome** (Android y escritorio).
  En Safari/iOS el soporte es limitado o inexistente según versión; en esos
  casos siempre queda disponible el campo de texto como alternativa (que
  también interpreta fecha/hora automáticamente).
- Los **recordatorios** se disparan mientras la app está abierta (pestaña o
  PWA instalada). Al no haber un servidor que empuje notificaciones (push),
  no se garantiza el aviso si el navegador está completamente cerrado. Para
  alarmas 100% confiables con la app cerrada haría falta un backend con
  notificaciones push, que no forma parte de este proyecto.
- El intérprete de fechas ("mañana", "el viernes", "en 2 horas", "el 15 de
  septiembre", etc.) cubre las expresiones más comunes en español rioplatense,
  pero no es infalible. Siempre se puede corregir la fecha a mano tocando la
  tarea y editándola, o usando el chip "Fecha y hora" antes de agregarla.

## Estructura

- `index.html` — estructura de la página.
- `style.css` — estilos.
- `dateParser.js` — intérprete de fechas/horas en español (sin dependencias,
  reutilizable y testeable con Node).
- `app.js` — lógica de la app: voz, almacenamiento, render, recordatorios.
- `manifest.json` / `sw.js` / `icon.svg` — soporte PWA (instalar en el
  celular, funcionamiento offline básico).
- `.github/workflows/deploy.yml` — publicación automática en GitHub Pages.
