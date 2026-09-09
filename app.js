(function () {
  'use strict';

  var STORAGE_KEY_LEGACY = 'agenda_tareas_v1'; // localStorage previo a Firestore, solo para migrar una vez
  var LEAD_MS = 15 * 60 * 1000; // avisar 15 minutos antes del vencimiento
  var parseSpanishDateTime = window.DateParser.parseSpanishDateTime;

  // --- Estado ---
  var tasks = [];
  var currentUid = null;
  var unsubscribeTasks = null;
  var appIniciada = false;
  var pendingDate = null; // Date | null, elegida a mano con el chip "Fecha y hora"
  var pendingReminder = false;
  var editingId = null;
  var lastDeleted = null;
  var recognizing = false;
  var recognition = null;

  // --- Elementos ---
  var micBtn = document.getElementById('micBtn');
  var micLabel = document.getElementById('micLabel');
  var taskInput = document.getElementById('taskInput');
  var addBtn = document.getElementById('addBtn');
  var dateChip = document.getElementById('dateChip');
  var dateChipLabel = document.getElementById('dateChipLabel');
  var reminderChip = document.getElementById('reminderChip');
  var dateTimeNative = document.getElementById('dateTimeNative');
  var toast = document.getElementById('toast');

  var vencidasSection = document.getElementById('vencidasSection');
  var vencidasList = document.getElementById('vencidasList');
  var vencidasCount = document.getElementById('vencidasCount');
  var hoyList = document.getElementById('hoyList');
  var hoyCount = document.getElementById('hoyCount');
  var hoyEmpty = document.getElementById('hoyEmpty');
  var proximasList = document.getElementById('proximasList');
  var proximasCount = document.getElementById('proximasCount');
  var proximasEmpty = document.getElementById('proximasEmpty');
  var completadasSection = document.getElementById('completadasSection');
  var completadasList = document.getElementById('completadasList');
  var completadasCount = document.getElementById('completadasCount');
  var completadasToggle = document.getElementById('completadasToggle');

  var calMonthLabel = document.getElementById('calMonthLabel');
  var calendarGrid = document.getElementById('calendarGrid');
  var calPrevBtn = document.getElementById('calPrevBtn');
  var calNextBtn = document.getElementById('calNextBtn');
  var calendarMonth = new Date();
  calendarMonth.setDate(1);
  calendarMonth.setHours(0, 0, 0, 0);

  var authScreen = document.getElementById('authScreen');
  var appRoot = document.getElementById('appRoot');
  var authEmail = document.getElementById('authEmail');
  var authPassword = document.getElementById('authPassword');
  var authError = document.getElementById('authError');
  var authLoginBtn = document.getElementById('authLoginBtn');
  var authSignupBtn = document.getElementById('authSignupBtn');
  var userEmailLabel = document.getElementById('userEmailLabel');
  var logoutBtn = document.getElementById('logoutBtn');

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // --- Utilidades de fecha ---
  function esMismoDia(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function formatearFechaHora(iso, hasTime) {
    var d = new Date(iso);
    var hoy = new Date();
    var manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
    var dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    var parte;
    if (esMismoDia(d, hoy)) parte = 'Hoy';
    else if (esMismoDia(d, manana)) parte = 'Mañana';
    else parte = dias[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    if (hasTime) {
      parte += ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    return parte;
  }

  function toDatetimeLocalValue(d) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function estadoTarea(t) {
    if (!t.dueDate) return 'normal';
    var ms = new Date(t.dueDate).getTime() - Date.now();
    if (ms < 0) return 'vencida';
    if (ms <= LEAD_MS) return 'porvencer';
    return 'normal';
  }

  // --- Toast con deshacer ---
  var toastTimer = null;
  var suprimirClickAfuera = false;
  function mostrarToast(msg, opciones) {
    opciones = opciones || {};
    toast.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = msg;
    toast.appendChild(span);
    if (opciones.onUndo) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Deshacer';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        opciones.onUndo();
        ocultarToast();
      });
      toast.appendChild(btn);
    }
    var cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar aviso');
    cerrar.textContent = '✕';
    cerrar.addEventListener('click', function (e) {
      e.stopPropagation();
      ocultarToast();
    });
    toast.appendChild(cerrar);

    toast.hidden = false;
    suprimirClickAfuera = true;
    setTimeout(function () { suprimirClickAfuera = false; }, 0);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(ocultarToast, opciones.duracion || 2000);
  }
  function ocultarToast() {
    toast.hidden = true;
    clearTimeout(toastTimer);
  }
  function cerrarSiEsAfuera(e) {
    if (suprimirClickAfuera) return;
    if (!toast.hidden && !toast.contains(e.target)) ocultarToast();
  }
  document.addEventListener('click', cerrarSiEsAfuera);
  document.addEventListener('touchstart', cerrarSiEsAfuera, { passive: true });

  // --- Reconocimiento de voz ---
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setupRecognition() {
    if (!SpeechRecognitionCtor) {
      micBtn.classList.add('unsupported');
      micLabel.textContent = 'Tu navegador no soporta dictado por voz. Usá el campo de texto.';
      return;
    }
    recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-AR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    var resultadoFinalProcesado = false;

    recognition.onstart = function () {
      recognizing = true;
      resultadoFinalProcesado = false;
      micBtn.classList.add('listening');
      micLabel.textContent = 'Escuchando... hablá ahora';
    };

    recognition.onresult = function (event) {
      if (resultadoFinalProcesado) return;
      var texto = '';
      for (var i = 0; i < event.results.length; i++) {
        texto += event.results[i][0].transcript;
      }
      taskInput.value = texto;
      var ultimo = event.results[event.results.length - 1];
      if (ultimo.isFinal) {
        resultadoFinalProcesado = true;
        procesarTextoYAgregar(texto, { origen: 'voz' });
        // Safari/WebKit (iOS) a veces sigue escuchando y dispara más
        // resultados "finales" para la misma frase; se corta acá.
        try { recognition.stop(); } catch (e) { /* ya estaba detenido */ }
      }
    };

    recognition.onerror = function (event) {
      recognizing = false;
      micBtn.classList.remove('listening');
      if (event.error === 'no-speech') {
        micLabel.textContent = 'No te escuché. Tocá para intentar de nuevo.';
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        micLabel.textContent = 'Necesito permiso para usar el micrófono.';
      } else {
        micLabel.textContent = 'Tocá para hablar';
      }
    };

    recognition.onend = function () {
      recognizing = false;
      micBtn.classList.remove('listening');
      if (micLabel.textContent === 'Escuchando... hablá ahora') {
        micLabel.textContent = 'Tocá para hablar';
      }
    };
  }

  function alternarEscucha() {
    if (!recognition) return;
    if (recognizing) {
      recognition.stop();
      return;
    }
    taskInput.value = '';
    try {
      recognition.start();
    } catch (e) { /* ya estaba iniciado */ }
  }

  // --- Notificaciones ---
  function pedirPermisoNotificaciones() {
    if (!('Notification' in window)) {
      // En iPhone, Safari solo permite notificaciones si la app está
      // instalada en la pantalla de inicio; en una pestaña normal no
      // existe la API. Igual queda el resaltado visual en la lista.
      mostrarToast('Este navegador no puede avisarte con notificaciones. En iPhone, instalá la app en la pantalla de inicio (Compartir → Agregar a inicio) para que funcionen.', { duracion: 6000 });
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    } else if (Notification.permission === 'denied') {
      mostrarToast('Bloqueaste las notificaciones para esta página. Activalas desde los ajustes del navegador si querés recibir avisos.', { duracion: 6000 });
    }
  }

  function notificar(titulo, cuerpo) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(titulo, { body: cuerpo, icon: 'icon.svg' });
    } catch (e) { /* algunos navegadores móviles requieren Service Worker */ }
  }

  // --- Agregar / procesar tareas ---
  function procesarTextoYAgregar(textoOriginal, opts) {
    opts = opts || {};
    var texto = (textoOriginal || '').trim();
    if (!texto || !currentUid) return;

    var resultado = parseSpanishDateTime(texto, new Date());
    var dueDate = pendingDate || resultado.date;
    var hasTime = pendingDate ? true : resultado.hasTime;
    var titulo = resultado.title || texto;

    var id = nuevoId();
    var tarea = {
      text: titulo,
      dueDate: dueDate ? dueDate.toISOString() : null,
      hasTime: hasTime,
      reminder: pendingReminder || (opts.origen === 'voz' && !!dueDate),
      done: false,
      notifiedSoon: false,
      notifiedDue: false,
      createdAt: new Date().toISOString()
    };
    window.FB.setDoc(window.FB.taskDoc(currentUid, id), tarea).catch(function () {
      mostrarToast('No se pudo guardar. Revisá tu conexión.');
    });

    if (tarea.reminder) pedirPermisoNotificaciones();

    var detalle = dueDate ? formatearFechaHora(tarea.dueDate, hasTime) : 'sin fecha';
    mostrarToast('Tarea agregada: "' + titulo + '" (' + detalle + ')', {
      onUndo: function () {
        window.FB.deleteDoc(window.FB.taskDoc(currentUid, id)).catch(function () {});
      }
    });

    taskInput.value = '';
    limpiarPendientes();
  }

  function limpiarPendientes() {
    pendingDate = null;
    pendingReminder = false;
    dateChip.classList.remove('active');
    dateChipLabel.textContent = 'Fecha y hora';
    reminderChip.classList.remove('active');
    dateTimeNative.value = '';
  }

  // --- Chips ---
  dateChip.addEventListener('click', function () {
    try {
      dateTimeNative.showPicker();
    } catch (e) {
      dateTimeNative.focus();
      dateTimeNative.click();
    }
  });

  dateTimeNative.addEventListener('change', function () {
    if (!dateTimeNative.value) return;
    pendingDate = new Date(dateTimeNative.value);
    dateChip.classList.add('active');
    dateChipLabel.textContent = formatearFechaHora(pendingDate.toISOString(), true);
  });

  reminderChip.addEventListener('click', function () {
    pendingReminder = !pendingReminder;
    reminderChip.classList.toggle('active', pendingReminder);
    if (pendingReminder) pedirPermisoNotificaciones();
  });

  // --- Entrada manual ---
  addBtn.addEventListener('click', function () {
    procesarTextoYAgregar(taskInput.value, { origen: 'texto' });
  });
  taskInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      procesarTextoYAgregar(taskInput.value, { origen: 'texto' });
    }
  });

  micBtn.addEventListener('click', alternarEscucha);

  // --- Marcar como hecha / eliminar / editar ---
  function marcarHecha(id) {
    window.FB.updateDoc(window.FB.taskDoc(currentUid, id), { done: true }).catch(function () {});
  }

  function restaurar(id) {
    window.FB.updateDoc(window.FB.taskDoc(currentUid, id), { done: false }).catch(function () {});
  }

  function eliminar(id) {
    var t = tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    var copia = {};
    Object.keys(t).forEach(function (k) { if (k !== 'id') copia[k] = t[k]; });
    window.FB.deleteDoc(window.FB.taskDoc(currentUid, id)).catch(function () {});
    mostrarToast('Tarea eliminada', {
      onUndo: function () {
        window.FB.setDoc(window.FB.taskDoc(currentUid, id), copia).catch(function () {});
      }
    });
  }

  function guardarEdicion(id, nuevoTexto, nuevaFecha, nuevoReminder) {
    var cambios = {
      dueDate: nuevaFecha ? nuevaFecha.toISOString() : null,
      hasTime: !!nuevaFecha,
      reminder: nuevoReminder,
      notifiedSoon: false,
      notifiedDue: false
    };
    var textoLimpio = nuevoTexto.trim();
    if (textoLimpio) cambios.text = textoLimpio;
    editingId = null;
    window.FB.updateDoc(window.FB.taskDoc(currentUid, id), cambios).catch(function () {});
  }

  // --- Iconos SVG reutilizables ---
  var ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 7"></path></svg>'
  };

  // --- Render ---
  function crearTaskCard(t) {
    var card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-task-id', t.id);
    var estado = estadoTarea(t);
    if (estado === 'vencida') card.classList.add('vencida');
    if (estado === 'porvencer') card.classList.add('porvencer');

    if (editingId === t.id) {
      card.appendChild(crearFormEdicion(t));
      return card;
    }

    var checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'check-btn' + (t.done ? ' done' : '');
    checkBtn.innerHTML = t.done ? ICONS.check : '';
    checkBtn.setAttribute('aria-label', t.done ? 'Marcar como pendiente' : 'Marcar como realizada');
    checkBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (t.done) restaurar(t.id);
      else {
        card.classList.add('leaving');
        setTimeout(function () { marcarHecha(t.id); }, 220);
      }
    });

    var main = document.createElement('div');
    main.className = 'task-main';
    var textEl = document.createElement('div');
    textEl.className = 'task-text';
    textEl.textContent = t.text;
    main.appendChild(textEl);

    if (t.dueDate || t.reminder) {
      var meta = document.createElement('div');
      meta.className = 'task-meta';
      if (t.dueDate) {
        var badge = document.createElement('span');
        badge.className = 'badge' + (estado === 'vencida' ? ' danger' : estado === 'porvencer' ? ' warn' : '');
        badge.textContent = (estado === 'vencida' ? 'Venció · ' : estado === 'porvencer' ? 'Por vencer · ' : '') + formatearFechaHora(t.dueDate, t.hasTime);
        meta.appendChild(badge);
      }
      if (t.reminder) {
        var badgeBell = document.createElement('span');
        badgeBell.className = 'badge';
        badgeBell.innerHTML = ICONS.bell.replace('viewBox', 'style="width:11px;height:11px" viewBox') + ' recordatorio';
        meta.appendChild(badgeBell);
      }
      main.appendChild(meta);
    }
    main.addEventListener('click', function () {
      editingId = t.id;
      render();
    });

    var actions = document.createElement('div');
    actions.className = 'task-actions';
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn delete';
    delBtn.innerHTML = ICONS.trash;
    delBtn.setAttribute('aria-label', 'Eliminar tarea');
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      eliminar(t.id);
    });
    actions.appendChild(delBtn);

    card.appendChild(checkBtn);
    card.appendChild(main);
    card.appendChild(actions);
    return card;
  }

  function crearFormEdicion(t) {
    var form = document.createElement('div');
    form.className = 'edit-form';

    var inputText = document.createElement('input');
    inputText.type = 'text';
    inputText.value = t.text;

    var row = document.createElement('div');
    row.className = 'edit-row';

    var inputDate = document.createElement('input');
    inputDate.type = 'datetime-local';
    if (t.dueDate) inputDate.value = toDatetimeLocalValue(new Date(t.dueDate));

    var labelReminder = document.createElement('label');
    var checkboxReminder = document.createElement('input');
    checkboxReminder.type = 'checkbox';
    checkboxReminder.checked = !!t.reminder;
    labelReminder.appendChild(checkboxReminder);
    labelReminder.appendChild(document.createTextNode('Recordatorio'));

    row.appendChild(inputDate);
    row.appendChild(labelReminder);

    var buttons = document.createElement('div');
    buttons.className = 'edit-buttons';

    var btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'btn btn-secondary';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', function (e) {
      e.stopPropagation();
      editingId = null;
      render();
    });

    var btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.className = 'btn btn-primary';
    btnSave.textContent = 'Guardar';
    btnSave.addEventListener('click', function (e) {
      e.stopPropagation();
      var nuevaFecha = inputDate.value ? new Date(inputDate.value) : null;
      guardarEdicion(t.id, inputText.value, nuevaFecha, checkboxReminder.checked);
    });

    buttons.appendChild(btnCancel);
    buttons.appendChild(btnSave);

    form.appendChild(inputText);
    form.appendChild(row);
    form.appendChild(buttons);
    form.addEventListener('click', function (e) { e.stopPropagation(); });
    return form;
  }

  function crearCompletadaCard(t) {
    var card = document.createElement('div');
    card.className = 'task-card';
    var main = document.createElement('div');
    main.className = 'task-main';
    var textEl = document.createElement('div');
    textEl.className = 'task-text';
    textEl.style.textDecoration = 'line-through';
    textEl.style.color = 'var(--text-muted)';
    textEl.textContent = t.text;
    main.appendChild(textEl);

    var actions = document.createElement('div');
    actions.className = 'task-actions';
    var undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'icon-btn';
    undoBtn.innerHTML = ICONS.undo;
    undoBtn.setAttribute('aria-label', 'Reabrir tarea');
    undoBtn.addEventListener('click', function () { restaurar(t.id); });
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn delete';
    delBtn.innerHTML = ICONS.trash;
    delBtn.setAttribute('aria-label', 'Eliminar definitivamente');
    delBtn.addEventListener('click', function () { eliminar(t.id); });
    actions.appendChild(undoBtn);
    actions.appendChild(delBtn);

    card.appendChild(main);
    card.appendChild(actions);
    return card;
  }

  function render() {
    var hoy = new Date();
    var pendientes = tasks.filter(function (t) { return !t.done; });
    var completadas = tasks.filter(function (t) { return t.done; });

    var vencidas = [];
    var deHoy = [];
    var proximas = [];

    pendientes.forEach(function (t) {
      if (!t.dueDate) { deHoy.push(t); return; }
      var d = new Date(t.dueDate);
      if (d < hoy && !esMismoDia(d, hoy)) vencidas.push(t);
      else if (esMismoDia(d, hoy)) {
        if (d < hoy) vencidas.push(t); // hoy pero la hora ya pasó
        else deHoy.push(t);
      } else proximas.push(t);
    });

    function porFecha(a, b) {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return -1;
      if (!b.dueDate) return 1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    vencidas.sort(porFecha);
    deHoy.sort(porFecha);
    proximas.sort(porFecha);

    renderLista(vencidasList, vencidas);
    vencidasSection.hidden = vencidas.length === 0;
    vencidasCount.textContent = vencidas.length;

    renderLista(hoyList, deHoy);
    hoyEmpty.hidden = deHoy.length > 0;
    hoyCount.textContent = deHoy.length;

    renderLista(proximasList, proximas);
    proximasEmpty.hidden = proximas.length > 0;
    proximasCount.textContent = proximas.length;

    completadasSection.hidden = completadas.length === 0;
    completadasCount.textContent = completadas.length;
    completadasList.innerHTML = '';
    completadas.forEach(function (t) { completadasList.appendChild(crearCompletadaCard(t)); });

    renderCalendario();
  }

  function renderLista(container, lista) {
    container.innerHTML = '';
    lista.forEach(function (t) { container.appendChild(crearTaskCard(t)); });
  }

  completadasToggle.addEventListener('click', function () {
    completadasList.hidden = !completadasList.hidden;
  });

  // --- Calendario del mes ---
  var MESES_LARGO = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  function renderCalendario() {
    var anio = calendarMonth.getFullYear();
    var mes = calendarMonth.getMonth();
    calMonthLabel.textContent = MESES_LARGO[mes] + ' ' + anio;

    var tareasPorDia = {};
    tasks.forEach(function (t) {
      if (t.done || !t.dueDate) return;
      var d = new Date(t.dueDate);
      if (d.getFullYear() === anio && d.getMonth() === mes) {
        (tareasPorDia[d.getDate()] = tareasPorDia[d.getDate()] || []).push(t.id);
      }
    });

    var hoy = new Date();
    var esMesActual = hoy.getFullYear() === anio && hoy.getMonth() === mes;
    var primerDiaSemana = new Date(anio, mes, 1).getDay();
    var diasEnMes = new Date(anio, mes + 1, 0).getDate();

    calendarGrid.innerHTML = '';
    for (var i = 0; i < primerDiaSemana; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }
    for (var dia = 1; dia <= diasEnMes; dia++) {
      var celda = document.createElement('div');
      celda.className = 'calendar-day';
      var idsDelDia = tareasPorDia[dia];
      if (idsDelDia) {
        celda.classList.add('has-tasks');
        celda.addEventListener('click', crearHandlerDiaCalendario(idsDelDia));
      }
      if (esMesActual && dia === hoy.getDate()) celda.classList.add('today');
      celda.textContent = dia;
      calendarGrid.appendChild(celda);
    }
  }

  function crearHandlerDiaCalendario(ids) {
    return function () { irATareasDelDia(ids); };
  }

  function irATareasDelDia(ids) {
    var primero = null;
    ids.forEach(function (id) {
      var card = document.querySelector('.task-card[data-task-id="' + id + '"]');
      if (!card) return;
      if (!primero) primero = card;
      card.classList.add('highlighted');
      setTimeout(function () { card.classList.remove('highlighted'); }, 1600);
    });
    if (primero) primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  calPrevBtn.addEventListener('click', function () {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderCalendario();
  });
  calNextBtn.addEventListener('click', function () {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderCalendario();
  });

  // --- Chequeo periódico de recordatorios ---
  function chequearRecordatorios() {
    tasks.forEach(function (t) {
      if (t.done || !t.dueDate || !t.reminder) return;
      var ms = new Date(t.dueDate).getTime() - Date.now();
      if (ms <= 0 && !t.notifiedDue) {
        notificar('Tarea vencida', t.text);
        window.FB.updateDoc(window.FB.taskDoc(currentUid, t.id), { notifiedDue: true }).catch(function () {});
      } else if (ms > 0 && ms <= LEAD_MS && !t.notifiedSoon) {
        notificar('Por vencer: ' + t.text, 'Vence a las ' + formatearFechaHora(t.dueDate, true).split('· ')[1]);
        window.FB.updateDoc(window.FB.taskDoc(currentUid, t.id), { notifiedSoon: true }).catch(function () {});
      }
    });
    render();
  }

  // --- Autenticación ---
  function mostrarErrorAuth(msg) {
    authError.textContent = msg;
    authError.hidden = false;
  }
  function limpiarErrorAuth() {
    authError.hidden = true;
  }
  function traducirErrorAuth(err) {
    var code = (err && err.code) || '';
    if (code.indexOf('wrong-password') !== -1 || code.indexOf('invalid-credential') !== -1) return 'Contraseña incorrecta.';
    if (code.indexOf('user-not-found') !== -1) return 'No existe una cuenta con ese correo. Tocá "Crear cuenta".';
    if (code.indexOf('email-already-in-use') !== -1) return 'Ya existe una cuenta con ese correo. Iniciá sesión.';
    if (code.indexOf('weak-password') !== -1) return 'La contraseña debe tener al menos 6 caracteres.';
    if (code.indexOf('invalid-email') !== -1) return 'El correo no es válido.';
    return 'Ocurrió un error. Probá de nuevo.';
  }

  function iniciarSesion() {
    limpiarErrorAuth();
    var email = authEmail.value.trim();
    var pass = authPassword.value;
    if (!email || !pass) { mostrarErrorAuth('Completá correo y contraseña.'); return; }
    window.FB.signIn(email, pass).catch(function (err) { mostrarErrorAuth(traducirErrorAuth(err)); });
  }
  function crearCuenta() {
    limpiarErrorAuth();
    var email = authEmail.value.trim();
    var pass = authPassword.value;
    if (!email || !pass) { mostrarErrorAuth('Completá correo y contraseña.'); return; }
    window.FB.signUp(email, pass).catch(function (err) { mostrarErrorAuth(traducirErrorAuth(err)); });
  }

  authLoginBtn.addEventListener('click', iniciarSesion);
  authSignupBtn.addEventListener('click', crearCuenta);
  authPassword.addEventListener('keydown', function (e) { if (e.key === 'Enter') iniciarSesion(); });
  logoutBtn.addEventListener('click', function () { window.FB.logout(); });

  function migrarTareasLocalesSiHaceFalta(uid) {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY_LEGACY); } catch (e) { raw = null; }
    if (!raw) return;
    var locales;
    try { locales = JSON.parse(raw); } catch (e) { return; }
    if (!locales || !locales.length) return;
    window.FB.getTasksOnce(uid).then(function (snap) {
      if (!snap.empty) return; // ya hay tareas en la nube, no se pisan
      locales.forEach(function (t) {
        var copia = {};
        Object.keys(t).forEach(function (k) { if (k !== 'id') copia[k] = t[k]; });
        window.FB.setDoc(window.FB.taskDoc(uid, t.id || nuevoId()), copia).catch(function () {});
      });
      try { localStorage.removeItem(STORAGE_KEY_LEGACY); } catch (e) { /* nada que hacer */ }
    }).catch(function () { /* si falla, quedan solo en localStorage */ });
  }

  function iniciarApp(uid) {
    if (appIniciada) return;
    appIniciada = true;
    migrarTareasLocalesSiHaceFalta(uid);
    unsubscribeTasks = window.FB.onTasksSnapshot(uid, function (snap) {
      tasks = [];
      snap.forEach(function (docSnap) {
        var data = docSnap.data();
        data.id = docSnap.id;
        tasks.push(data);
      });
      render();
    });
    setupRecognition();
    setInterval(chequearRecordatorios, 30000);
  }

  function cerrarApp() {
    appIniciada = false;
    if (unsubscribeTasks) { unsubscribeTasks(); unsubscribeTasks = null; }
    tasks = [];
    currentUid = null;
    render();
  }

  function esperarFirebase(cb) {
    if (window.FB) { cb(); return; }
    window.addEventListener('firebase-ready', cb, { once: true });
  }

  esperarFirebase(function () {
    window.FB.onAuthStateChanged(function (user) {
      if (user) {
        currentUid = user.uid;
        authScreen.hidden = true;
        appRoot.hidden = false;
        userEmailLabel.textContent = user.email || '';
        iniciarApp(user.uid);
      } else {
        cerrarApp();
        authScreen.hidden = false;
        appRoot.hidden = true;
      }
    });
  });
})();
