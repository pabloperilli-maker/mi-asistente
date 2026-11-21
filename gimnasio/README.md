# Rutina Gim

App web (PWA, funciona offline e instalable en el celular) para entrenar con una rutina personalizada.
Se publica junto con el resto del repo en GitHub Pages: `https://<usuario>.github.io/mi-asistente/gimnasio/`.

## Qué hace
- **Perfil**: edad, sexo, peso, altura, objetivo (masa muscular, fuerza, bajar grasa, salud), experiencia,
  lugar (gimnasio / casa con mancuernas / sin equipo), días disponibles, minutos por sesión y zonas a cuidar
  (rodillas, lumbar, hombros). Incluye un chequeo de salud previo basado en el PAR-Q.
- **Días recomendados** según objetivo y nivel, elegidos entre los días disponibles y bien espaciados.
  Divisiones: cuerpo completo (2–3 días), torso/pierna (4), híbrida (5), empuje/tracción/pierna x2 (6).
- **Series, repeticiones, RIR y descanso** por objetivo, ajustados por nivel y edad; la sesión se recorta al tiempo disponible.
- **Peso sugerido** en la primera sesión (estimación prudente por peso corporal, sexo, edad y nivel) y después
  **progresión automática** (doble progresión): sube la carga al completar el tope del rango, la baja ~10 % si te
  estancás o quedás corto, y programa **semanas de descarga**.
- **Temporizador de descanso** con pitidos (3-2-1 y alarma final), vibración, notificación en segundo plano y
  pantalla siempre encendida durante el entrenamiento. Cronómetro para planchas.
- **Técnica**: imágenes de inicio/final con animación, claves y errores frecuentes, búsqueda de videos en
  YouTube y posibilidad de guardar un video elegido para verlo incrustado.
- Series de aproximación, calculadora de discos, cambio de ejercicio por alternativas equivalentes.
- **Progreso**: 1RM estimado por ejercicio, mejores marcas, peso corporal, historial, exportar/importar datos.
- **Contraseña opcional** (Perfil → Contraseña): bloquea la app en el dispositivo al abrirla y tras 5 min en segundo plano.
- Indicadores: IMC, metabolismo basal, calorías objetivo, proteína, agua y zona 2 de frecuencia cardíaca.

Los datos quedan solo en el dispositivo (`localStorage`). Imágenes: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público).

## Archivos
- `exercises.js` catálogo (técnica, patrones, cargas de referencia).
- `engine.js` lógica pura: plan, cargas, progresión, descargas (testeable con Node).
- `app.js` interfaz. `sw.js`, `manifest.json`, `icon.svg` PWA.

Es una guía orientativa: no reemplaza la evaluación médica ni a un profesional del entrenamiento.
