/*
 * Interprete de fechas y horas en español (Argentina) para texto libre.
 * Reconoce expresiones como "mañana a las 10", "el viernes", "en 2 horas",
 * "el 15 de septiembre", "pasado mañana al mediodía", etc. y separa esa
 * parte del texto para dejar solo el título de la tarea.
 *
 * Se comparte entre el navegador (app.js) y Node (tests) via este wrapper.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DateParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  var MESES = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
    noviembre: 10, diciembre: 11
  };
  var LETRAS_MESES = Object.keys(MESES).join('|');
  var LETRAS_DIAS = DIAS.join('|');
  var CONECTORES = 'el|la|los|las|de|del|para|al|en|que|un|una';

  function quitarTildes(s) {
    // Reemplazos de longitud 1:1 para no desalinear los índices de match.
    return s
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
      .replace(/ñ/g, 'n');
  }

  function normalizar(s) {
    return quitarTildes(s.toLowerCase());
  }

  function quitarSpan(text, norm, start, end) {
    return {
      text: text.slice(0, start) + ' ' + text.slice(end),
      norm: norm.slice(0, start) + ' ' + norm.slice(end)
    };
  }

  function limpiarTexto(t) {
    t = t.replace(/\b(recordame|recordarme|record[aá]me|avisame|avis[aá]me|acordate de|acordate|no me olvide de|no me olvid[eé] de|tengo que|hay que)\b/gi, '');
    t = t.replace(/\s{2,}/g, ' ').trim();
    t = t.replace(/^[,.;:-]+|[,.;:-]+$/g, '').trim();

    // Saca preposiciones/artículos sueltos que quedan pegados en los bordes
    // después de haber removido la fecha/hora (ej: "el escrito el" -> "el escrito").
    var borde = new RegExp('^(?:' + CONECTORES + ')\\s+|\\s+(?:' + CONECTORES + ')$', 'i');
    var cambiado = true;
    while (cambiado) {
      var antes = t;
      t = t.replace(borde, '').trim();
      cambiado = t !== antes;
    }
    return t;
  }

  function capitalizar(t) {
    if (!t) return t;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function extraerHora(text, norm, now) {
    var m;
    if ((m = norm.match(/\ben\s+(\d+)\s+horas?\b/))) {
      return { span: m, dt: new Date(now.getTime() + parseInt(m[1], 10) * 3600000), soloOffset: true };
    }
    if ((m = norm.match(/\ben\s+(\d+)\s+minutos?\b/))) {
      return { span: m, dt: new Date(now.getTime() + parseInt(m[1], 10) * 60000), soloOffset: true };
    }
    if ((m = norm.match(/\ba(?:l)?\s*medio\s*dia\b/))) {
      return { span: m, h: 12, min: 0 };
    }
    if ((m = norm.match(/\ba\s*media\s*noche\b/))) {
      return { span: m, h: 0, min: 0 };
    }
    if ((m = norm.match(/\ba\s+las?\s+(\d{1,2})(?:[:.,](\d{2}))?\s*(y\s*media)?\s*(de\s+la\s+manana|de\s+la\s+tarde|de\s+la\s+noche|hs\.?|horas?)?\b/))) {
      var h = parseInt(m[1], 10);
      var min = m[2] ? parseInt(m[2], 10) : (m[3] ? 30 : 0);
      var periodo = m[4] || '';
      if (/tarde|noche/.test(periodo) && h < 12) h += 12;
      if (/manana/.test(periodo) && h === 12) h = 0;
      return { span: m, h: h, min: min };
    }
    // Variante sin "a las" (ej. dictado que recorta la preposición): "19 horas", "19hs", "19:30hs".
    if ((m = norm.match(/\b(\d{1,2})(?:[:.,](\d{2}))?\s*(hs\.?|horas?)\b/))) {
      var h2 = parseInt(m[1], 10);
      if (h2 <= 23) {
        var min2 = m[2] ? parseInt(m[2], 10) : 0;
        return { span: m, h: h2, min: min2 };
      }
    }
    return null;
  }

  function extraerFecha(text, norm, now) {
    var m;
    if ((m = norm.match(/pasado\s+manana/))) {
      var d = new Date(now);
      d.setDate(d.getDate() + 2);
      return { span: m, dt: d };
    }
    if ((m = norm.match(/\bmanana\b/))) {
      var d2 = new Date(now);
      d2.setDate(d2.getDate() + 1);
      return { span: m, dt: d2 };
    }
    if ((m = norm.match(/\bhoy\b/))) {
      return { span: m, dt: new Date(now) };
    }
    if ((m = norm.match(new RegExp('\\b(?:el\\s+)?(?:proximo\\s+)?(?:dia\\s+)?(' + LETRAS_DIAS + ')(?:\\s+que\\s+viene)?\\b')))) {
      var target = DIAS.indexOf(m[1]);
      var diff0 = (target - now.getDay() + 7) % 7;
      var esProximo = /proximo|que\s+viene/.test(m[0]);
      var diff = diff0 === 0 ? (esProximo ? 7 : 0) : diff0;
      var d3 = new Date(now);
      d3.setDate(d3.getDate() + diff);
      return { span: m, dt: d3 };
    }
    if ((m = norm.match(/\ben\s+(\d+)\s+semanas?\b/))) {
      var d4 = new Date(now);
      d4.setDate(d4.getDate() + parseInt(m[1], 10) * 7);
      return { span: m, dt: d4 };
    }
    if ((m = norm.match(/\ben\s+(\d+)\s+dias?\b/))) {
      var d5 = new Date(now);
      d5.setDate(d5.getDate() + parseInt(m[1], 10));
      return { span: m, dt: d5 };
    }
    if ((m = norm.match(new RegExp('\\bel\\s+(\\d{1,2})\\s+de\\s+(' + LETRAS_MESES + ')(?:\\s+de\\s+(\\d{4}))?\\b')))) {
      var dia1 = parseInt(m[1], 10);
      var mes1 = MESES[m[2]];
      var anio1 = m[3] ? parseInt(m[3], 10) : now.getFullYear();
      var fecha1 = new Date(anio1, mes1, dia1);
      if (!m[3] && fecha1 < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        fecha1.setFullYear(anio1 + 1);
      }
      return { span: m, dt: fecha1 };
    }
    if ((m = norm.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/))) {
      var dia2 = parseInt(m[1], 10), mes2 = parseInt(m[2], 10) - 1;
      var anio2 = m[3] ? parseInt(m[3], 10) : now.getFullYear();
      if (anio2 < 100) anio2 += 2000;
      return { span: m, dt: new Date(anio2, mes2, dia2) };
    }
    if ((m = norm.match(/\bel\s+(?:dia\s+)?(\d{1,2})\b/))) {
      var dia3 = parseInt(m[1], 10);
      var candidato = new Date(now.getFullYear(), now.getMonth(), dia3);
      if (candidato < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        candidato = new Date(now.getFullYear(), now.getMonth() + 1, dia3);
      }
      return { span: m, dt: candidato };
    }
    return null;
  }

  function parseSpanishDateTime(input, now) {
    now = now || new Date();
    var text = input;
    var norm = normalizar(text);

    // La hora se extrae primero: evita que "mañana" dentro de
    // "a las 9 de la mañana" se confunda con "mañana" = día siguiente.
    var horaInfo = extraerHora(text, norm, now);
    if (horaInfo) {
      ({ text: text, norm: norm } = quitarSpan(text, norm, horaInfo.span.index, horaInfo.span.index + horaInfo.span[0].length));
    }

    var fechaInfo = null;
    if (!horaInfo || !horaInfo.soloOffset) {
      fechaInfo = extraerFecha(text, norm, now);
      if (fechaInfo) {
        ({ text: text, norm: norm } = quitarSpan(text, norm, fechaInfo.span.index, fechaInfo.span.index + fechaInfo.span[0].length));
      }
    }

    var date = null;
    var hasTime = false;
    var hasDate = false;

    if (horaInfo && horaInfo.soloOffset) {
      date = horaInfo.dt;
      hasDate = true;
      hasTime = true;
    } else if (fechaInfo && horaInfo) {
      date = fechaInfo.dt;
      date.setHours(horaInfo.h, horaInfo.min, 0, 0);
      hasDate = true;
      hasTime = true;
    } else if (fechaInfo) {
      date = fechaInfo.dt;
      // Sin hora explícita: se toma como "en algún momento de ese día",
      // no como una hora fija que pueda quedar en el pasado horas después.
      date.setHours(23, 59, 0, 0);
      hasDate = true;
    } else if (horaInfo) {
      date = new Date(now);
      date.setHours(horaInfo.h, horaInfo.min, 0, 0);
      hasDate = true;
      hasTime = true;
    }

    text = limpiarTexto(text);
    if (!text) text = limpiarTexto(input) || input.trim();
    text = capitalizar(text);

    return { title: text, date: hasDate ? date : null, hasTime: hasTime, raw: input };
  }

  return { parseSpanishDateTime: parseSpanishDateTime };
});
