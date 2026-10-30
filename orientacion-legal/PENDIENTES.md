# Pendientes — Orientación Legal Express (sesión del 30/10/2026)

Estado: código completo en la rama `claude/orientacion-legal-express`. Flujo probado con IA simulada (`MOCK_IA=1`); falta probar con la API real.

## Para mañana
1. Probar con la IA real usando un documento verdadero:
   `cd orientacion-legal && npm install && ANTHROPIC_API_KEY=sk-ant-... ADMIN_PASSWORD=prueba npm start`
2. Elegir hosting con Node y disco persistente (Render, Railway, VPS). No funciona en GitHub Pages.
3. Cargar las variables secretas de `.env.example` (API key, ADMIN_PASSWORD, SESSION_SECRET, alias, titular, monto, DATA_DIR).
4. Completar y revisar `public/terminos.html` y `public/privacidad.html` (datos entre [corchetes] y puntos marcados "verificar"):
   - Transferencia internacional de datos (Anthropic, EE.UU.) — Ley 25.326.
   - Leyenda obligatoria de la Agencia de Acceso a la Información Pública (redacción exacta).
   - Arrepentimiento y devoluciones — Ley 24.240.

## Decisiones abiertas
- ¿La urgencia (Alta/Media/Baja) se muestra gratis o sólo después del pago? Hoy se ve gratis.
- ¿Borrar también el texto de la orientación a los 30 días? Hoy sólo se borran las imágenes.
- ¿Excluir la carpeta `orientacion-legal/` de la publicación en GitHub Pages?
