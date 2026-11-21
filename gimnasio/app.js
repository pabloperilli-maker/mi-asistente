/* Rutina Gim — interfaz. Todo se guarda en localStorage del dispositivo. */
(function () {
  'use strict';
  const Ex = window.GymExercises;
  const E = window.GymEngine;
  const { BY_ID, IMG_BASE, PATTERN_NAMES } = Ex;

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  const KEY = 'rutinaGim.v1';
  const DEFAULT_SETTINGS = { sound: true, volume: 0.8, vibrate: true, notify: false, wakeLock: true };
  let S = load();
  let tab = 'hoy';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
        s.logs = s.logs || []; s.bw = s.bw || []; s.videos = s.videos || {};
        return s;
      }
    } catch (e) { /* almacenamiento no disponible */ }
    return { profile: null, plan: null, logs: [], bw: [], active: null, settings: { ...DEFAULT_SETTINGS }, videos: {} };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar en este dispositivo'); }
  }

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
  const kg = E.fmtKg;
  const fmtN = (n) => String(+(+n).toFixed(2)).replace('.', ',');
  const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const restTxt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`);
  const img = (ex, i = 0) => `${IMG_BASE}${ex.img}/${i}.jpg`;
  const dateShort = (iso) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, ms);
  }

  function openModal(html, cls = '') {
    $('#modalBody').innerHTML = html;
    $('#modal').className = `modal ${cls}`;
    $('#modal').hidden = false;
  }
  function closeModal() {
    $('#modal').hidden = true; $('#modalBody').innerHTML = '';
    clearInterval(openModal._anim);
  }

  // ------------------------------------------------------------------
  // Sonido, vibración y notificaciones
  // ------------------------------------------------------------------
  let actx = null;
  function audio() {
    if (!actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function beep(freq = 880, dur = 0.15, delay = 0, type = 'sine') {
    if (!S.settings.sound) return;
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const vol = Math.max(0.01, S.settings.volume);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const tick = () => beep(760, 0.12, 0, 'square');
  function finishSound() {
    beep(880, 0.18, 0); beep(1175, 0.18, 0.2); beep(1568, 0.45, 0.4);
  }
  function vibrate(p) { if (S.settings.vibrate && navigator.vibrate) navigator.vibrate(p); }

  async function notify(title, body) {
    if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) reg.showNotification(title, { body, icon: 'icon.svg', tag: 'rest', renotify: true, vibrate: [300, 100, 300] });
      else new Notification(title, { body, icon: 'icon.svg' });
    } catch (e) { /* sin notificaciones */ }
  }

  // Mantener la pantalla encendida durante el entrenamiento.
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && S.settings.wakeLock && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S.active) keepAwake(true);
    if (document.visibilityState === 'visible') timerTick();
  });

  // ------------------------------------------------------------------
  // Temporizador (descanso y series por tiempo)
  // ------------------------------------------------------------------
  let timer = null; // { endAt, total, label, next, mode, onDone, lastBeep }
  let timerInt = null;

  function startTimer(sec, label, next, mode = 'rest', onDone = null) {
    audio(); // desbloquea audio con el gesto del usuario
    timer = { endAt: Date.now() + sec * 1000, total: sec, label, next, mode, onDone, lastBeep: null };
    if (S.active) { S.active.timer = { endAt: timer.endAt, total: sec, label, next, mode }; save(); }
    $('#restBar').hidden = false;
    $('#restBar').classList.toggle('work', mode === 'work');
    $('#restBar').classList.remove('done');
    clearInterval(timerInt);
    timerInt = setInterval(timerTick, 200);
    timerTick();
  }
  function timerTick() {
    if (!timer) return;
    const left = (timer.endAt - Date.now()) / 1000;
    $('#restTime').textContent = mmss(left);
    $('#restLabel').textContent = timer.label;
    $('#restNext').innerHTML = timer.next || '';
    $('#restFill').style.width = `${Math.max(0, Math.min(100, (1 - left / timer.total) * 100))}%`;
    const whole = Math.ceil(left);
    if (whole <= 3 && whole >= 1 && timer.lastBeep !== whole && !document.hidden) { timer.lastBeep = whole; tick(); }
    if (left <= 0) {
      const t = timer;
      stopTimer(false);
      finishSound();
      vibrate([400, 120, 400, 120, 400]);
      const msg = t.mode === 'work' ? '¡Tiempo! Serie completada.' : '¡Descanso terminado! A la próxima serie.';
      if (document.hidden) notify('Rutina Gim', msg);
      $('#restBar').hidden = false; $('#restBar').classList.add('done');
      $('#restLabel').textContent = t.mode === 'work' ? '¡Tiempo!' : '¡A entrenar!';
      $('#restTime').textContent = '0:00';
      setTimeout(() => { if (!timer) { $('#restBar').hidden = true; $('#restBar').classList.remove('done'); } }, 2500);
      if (t.onDone) t.onDone();
    }
  }
  function stopTimer(hide = true) {
    timer = null; clearInterval(timerInt);
    if (S.active) { delete S.active.timer; save(); }
    if (hide) { $('#restBar').hidden = true; $('#restBar').classList.remove('done'); }
  }

  // ------------------------------------------------------------------
  // Navegación
  // ------------------------------------------------------------------
  function render() {
    const hasProfile = !!(S.profile && S.plan);
    $('#tabbar').hidden = !hasProfile;
    if (!hasProfile) { $('#view').innerHTML = viewOnboarding(); return; }
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const v = { hoy: viewHoy, rutina: viewRutina, progreso: viewProgreso, perfil: viewPerfil }[tab];
    $('#view').innerHTML = v();
    if (tab === 'progreso') drawCharts();
  }

  // ------------------------------------------------------------------
  // Formulario de perfil (onboarding y edición)
  // ------------------------------------------------------------------
  const PARQ = [
    '¿Algún médico te dijo que tenés un problema cardíaco o de presión arterial?',
    '¿Sentís dolor en el pecho en reposo o al hacer actividad física?',
    '¿Perdiste el equilibrio por mareos o el conocimiento en el último año?',
    '¿Tenés algún problema óseo, articular o de columna que pueda empeorar con el ejercicio?',
    '¿Tomás medicación para la presión, el corazón u otra condición crónica (p. ej., diabetes)?',
    '¿Estás embarazada o tuviste un parto en los últimos 6 meses?'
  ];

  function profileForm(p, onboarding) {
    p = p || { sex: 'm', age: '', weight: '', height: '', goal: 'hipertrofia', level: 1, equipment: 'gym', weekdays: [1, 3, 5], sessionMin: 60, limits: [] };
    const radio = (name, val, label, sub) => `
      <label class="opt"><input type="radio" name="${name}" value="${val}" ${String(p[name]) === String(val) ? 'checked' : ''}/>
      <span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
    const days = [1, 2, 3, 4, 5, 6, 0].map((d) => `
      <label class="chip"><input type="checkbox" name="weekdays" value="${d}" ${p.weekdays.includes(d) ? 'checked' : ''}/><span>${E.DAY_NAMES[d]}</span></label>`).join('');
    const lim = [['rodilla', 'Rodillas'], ['lumbar', 'Zona lumbar'], ['hombro', 'Hombros']].map(([v, l]) => `
      <label class="chip"><input type="checkbox" name="limits" value="${v}" ${p.limits.includes(v) ? 'checked' : ''}/><span>${l}</span></label>`).join('');
    return `
    <form id="profileForm" class="form" autocomplete="off">
      <div class="card">
        <h3>Tus datos</h3>
        <label class="field"><span>Nombre (opcional)</span><input name="name" value="${esc(p.name || '')}" maxlength="30"/></label>
        <div class="seg">
          <label><input type="radio" name="sex" value="m" ${p.sex === 'm' ? 'checked' : ''}/><span>Hombre</span></label>
          <label><input type="radio" name="sex" value="f" ${p.sex === 'f' ? 'checked' : ''}/><span>Mujer</span></label>
        </div>
        <div class="grid3">
          <label class="field"><span>Edad</span><input name="age" type="number" inputmode="numeric" min="14" max="95" required value="${esc(p.age)}"/></label>
          <label class="field"><span>Peso (kg)</span><input name="weight" type="text" inputmode="decimal" required value="${esc(p.weight)}"/></label>
          <label class="field"><span>Altura (cm)</span><input name="height" type="number" inputmode="numeric" min="120" max="230" required value="${esc(p.height)}"/></label>
        </div>
      </div>

      <div class="card">
        <h3>Objetivo principal</h3>
        <div class="opts">
          ${radio('goal', 'hipertrofia', 'Ganar masa muscular', 'Hipertrofia: 6–15 reps, volumen moderado-alto')}
          ${radio('goal', 'fuerza', 'Ganar fuerza', 'Cargas altas, 4–6 reps en los básicos')}
          ${radio('goal', 'grasa', 'Bajar grasa / recomposición', 'Mantener músculo + cardio + déficit calórico')}
          ${radio('goal', 'salud', 'Salud general', 'Fuerza funcional, movilidad y corazón')}
        </div>
      </div>

      <div class="card">
        <h3>Experiencia entrenando</h3>
        <div class="opts">
          ${radio('level', 1, 'Principiante', 'Nunca entrené o menos de 6 meses constantes')}
          ${radio('level', 2, 'Intermedio', '6 meses a 2 años, conozco la técnica básica')}
          ${radio('level', 3, 'Avanzado', 'Más de 2 años de entrenamiento serio')}
        </div>
      </div>

      <div class="card">
        <h3>¿Dónde entrenás?</h3>
        <div class="opts">
          ${radio('equipment', 'gym', 'Gimnasio completo', 'Barras, máquinas, poleas y mancuernas')}
          ${radio('equipment', 'db', 'Casa con mancuernas', 'Mancuernas, banco y quizá una banda elástica')}
          ${radio('equipment', 'bw', 'Casa sin equipamiento', 'Solo peso corporal')}
        </div>
      </div>

      <div class="card">
        <h3>Disponibilidad</h3>
        <p class="muted small">Marcá los días que <b>podrías</b> ir. La app te recomienda cuántos usar y elige los más espaciados.</p>
        <div class="chips">${days}</div>
        <label class="field"><span>Tiempo por sesión</span>
          <select name="sessionMin">
            ${[45, 60, 75, 90].map((m) => `<option value="${m}" ${+p.sessionMin === m ? 'selected' : ''}>${m} minutos</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="card">
        <h3>Zonas a cuidar <small class="muted">(opcional)</small></h3>
        <p class="muted small">Si tenés molestias o lesiones previas, evitamos los ejercicios más exigentes para esa zona.</p>
        <div class="chips">${lim}</div>
      </div>

      ${onboarding ? `
      <div class="card">
        <h3>Chequeo de salud previo</h3>
        <p class="muted small">Cuestionario de aptitud (basado en el PAR-Q). Marcá si alguna aplica:</p>
        ${PARQ.map((q, i) => `<label class="qcheck"><input type="checkbox" name="parq" value="${i}"/><span>${q}</span></label>`).join('')}
      </div>` : ''}

      <button class="btn btn-primary btn-block" type="submit">${onboarding ? 'Armar mi rutina' : 'Guardar y regenerar rutina'}</button>
      ${onboarding ? '' : '<p class="muted small center">Tu historial se conserva. Las cargas se recalculan desde tus últimos registros.</p>'}
    </form>`;
  }

  function readProfileForm(form) {
    const fd = new FormData(form);
    const p = {
      name: (fd.get('name') || '').trim(),
      sex: fd.get('sex'),
      age: parseInt(fd.get('age'), 10),
      weight: num(fd.get('weight')),
      height: parseInt(fd.get('height'), 10),
      goal: fd.get('goal'),
      level: parseInt(fd.get('level'), 10),
      equipment: fd.get('equipment'),
      weekdays: fd.getAll('weekdays').map(Number),
      sessionMin: parseInt(fd.get('sessionMin'), 10),
      limits: fd.getAll('limits'),
      parq: fd.getAll('parq').length ? fd.getAll('parq').map(Number) : (S.profile && S.profile.parq) || []
    };
    const errs = [];
    if (!(p.age >= 14 && p.age <= 95)) errs.push('Edad entre 14 y 95');
    if (!(p.weight >= 30 && p.weight <= 250)) errs.push('Peso entre 30 y 250 kg');
    if (!(p.height >= 120 && p.height <= 230)) errs.push('Altura entre 120 y 230 cm');
    if (p.weekdays.length < 2) errs.push('Elegí al menos 2 días disponibles');
    return { p, errs };
  }

  function applyProfile(p, isNew) {
    const old = S.profile;
    S.profile = { ...(old || {}), ...p, autoDeload: old ? old.autoDeload : true };
    const plan = E.buildPlan(S.profile);
    S.profile.plannedDays = plan.daysPerWeek;
    plan.nextIdx = 0;
    if (S.plan && S.plan.custom) {
      S.autoPlan = plan; // se mantiene la rutina propia; la automática queda guardada
      S.plan.weekdays = E.spreadDays(p.weekdays, S.plan.days.length);
    } else S.plan = plan;
    if (isNew) {
      S.bw.push({ date: new Date().toISOString(), kg: p.weight });
    } else if (!S.bw.length || S.bw[S.bw.length - 1].kg !== p.weight) {
      S.bw.push({ date: new Date().toISOString(), kg: p.weight });
    }
    save();
  }

  function viewOnboarding() {
    return `
    <header class="hero">
      <div class="logo">${logoSvg()}</div>
      <h1>Rutina Gim</h1>
      <p>Tu plan de entrenamiento personalizado: series, repeticiones, peso sugerido, descanso con aviso sonoro, progresión automática y técnica de cada ejercicio.</p>
    </header>
    ${profileForm(null, true)}
    <p class="disclaimer">Esta app es una guía general y no reemplaza la evaluación de un médico ni de un profesor de educación física. Ante dolor, mareos o falta de aire, frená y consultá.</p>`;
  }

  function logoSvg() {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="24" width="8" height="16" rx="2"/><rect x="12" y="18" width="8" height="28" rx="2"/><rect x="44" y="18" width="8" height="28" rx="2"/><rect x="52" y="24" width="8" height="16" rx="2"/><rect x="20" y="29" width="24" height="6" rx="2"/></svg>';
  }

  // ------------------------------------------------------------------
  // Rutinas propias (del profe) con valores por semana
  // ------------------------------------------------------------------
  // weeks: [series, reps, kg] por semana. perSide = reps por lado.
  const PROFE_PLAN = {
    name: 'Rutina del profe (3 días, 4 semanas)',
    days: [
      { name: 'Día 1', focus: 'Cuádriceps · pecho · tríceps', items: [
        { exId: 'sentadilla_espanola', role: 'main', weeks: [[4, 8, 12.5], [4, 8, 12.5], [4, 8, 15], [4, 8, 15]] },
        { exId: 'prensa_horizontal', role: 'main', weeks: [[4, 12, 50], [4, 12, 50], [4, 12, 55], [4, 12, 55]] },
        { exId: 'press_banca', role: 'main', weeks: [[4, 6, 30], [4, 6, 30], [4, 6, 32.5], [4, 6, 32.5]] },
        { exId: 'press_maquina_neutra', role: 'main', weeks: [[4, 6, 30], [4, 6, 30], [4, 6, 35], [4, 6, 35]] },
        { exId: 'triceps_polea_1brazo', role: 'acc', perSide: true, weeks: [[3, 8, 10], [3, 8, 10], [3, 8, 15], [3, 8, 11.25]] }
      ] },
      { name: 'Día 2', focus: 'Isquiotibiales · espalda · bíceps', items: [
        { exId: 'rumano_db_disco', role: 'main', weeks: [[4, 8, 17.5], [4, 8, 17.5], [4, 8, 20], [4, 8, 20]] },
        { exId: 'curl_femoral', role: 'acc', weeks: [[3, 10, 30], [3, 10, 30], [3, 10, 30], [3, 10, 30]] },
        { exId: 'jalon', role: 'main', weeks: [[4, 12, 55], [4, 12, 55], [4, 12, 60], [4, 12, 60]] },
        { exId: 'remo_estocada', role: 'main', perSide: true, weeks: [[4, 8, 35], [4, 8, 35], [4, 8, 40], [4, 8, 40]] },
        { exId: 'biceps_polea_soga', role: 'acc', weeks: [[3, 10, 25], [3, 10, 25], [3, 10, 30], [3, 10, 30]] }
      ] },
      { name: 'Día 3', focus: 'Glúteos · hombros · espalda', items: [
        { exId: 'hip_thrust', role: 'main', weeks: [[4, 8, 65], [4, 8, 65], [4, 6, 70], [4, 6, 70]] },
        { exId: 'abductor', role: 'acc', weeks: [[3, 12, 30], [3, 12, 30], [3, 10, 35], [3, 10, 35]] },
        { exId: 'vuelos_frontales_soga', role: 'acc', weeks: [[3, 10, 15], [3, 10, 15], [3, 10, 20], [3, 10, 20]] },
        { exId: 'serrucho', role: 'main', perSide: true, weeks: [[3, 8, 15], [3, 8, 15], [3, 8, 17.5], [3, 8, 17.5]] },
        { exId: 'vuelos_posteriores_banco', role: 'acc', weeks: [[3, 8, 30], [3, 8, 30], [3, 8, 32.5], [3, 8, 32.5]] }
      ] }
    ]
  };

  function buildCustomPlan(tpl) {
    const p = S.profile;
    const days = tpl.days.map((d) => ({
      name: d.name, focus: d.focus,
      items: d.items.map((it) => ({
        exId: it.exId, role: it.role, perSide: !!it.perSide,
        rest: it.role === 'main' ? 120 : 75, rir: 2,
        weeks: it.weeks.map(([sets, reps, kgv]) => ({ sets, reps, kg: kgv }))
      }))
    }));
    const nWeeks = Math.max(...days.flatMap((d) => d.items.map((i) => i.weeks.length)));
    return {
      custom: true, id: uid(), createdAt: new Date().toISOString(),
      split: tpl.name, weekdays: E.spreadDays(p.weekdays && p.weekdays.length ? p.weekdays : [1, 3, 5], days.length),
      daysPerWeek: days.length, nWeeks, week: 1, nextIdx: 0,
      recDays: { why: 'Rutina cargada a partir de la planilla de tu profesor/a.' },
      days
    };
  }

  const curWeek = () => Math.min(S.plan.week || 1, S.plan.nWeeks || 1);
  const pastPlan = () => S.plan.custom && (S.plan.week || 1) > S.plan.nWeeks;

  // Devuelve el ítem con series/reps de la semana actual (rutinas propias).
  function resolve(it) {
    if (!it.weeks) return it;
    const w = it.weeks[Math.min(curWeek(), it.weeks.length) - 1] || it.weeks[it.weeks.length - 1];
    return { ...it, sets: w.sets, lo: w.reps, hi: w.reps, kgWeek: w.kg };
  }
  const rng = (it) => (it.lo === it.hi ? `${it.lo}` : `${it.lo}–${it.hi}`);
  const sideTxt = (it) => (it.perSide ? ' por lado' : '');

  function cyc() {
    if (S.plan.custom) return { isDeload: false, week: curWeek(), every: S.plan.nWeeks };
    return E.cycleInfo(S.plan, S.profile);
  }

  function customRec(r) {
    if (!pastPlan() && r.kgWeek != null) {
      return { kind: 'start', w: r.kgWeek, perHand: BY_ID[r.exId].tool === 'mancuernas', msg: `Semana ${curWeek()} de tu rutina: ${r.sets} × ${r.lo}${sideTxt(r)}${r.kgWeek != null ? ` con ${kg(r.kgWeek)}` : ''}. Si te sobra mucho, avisale a tu profe.` };
    }
    const rec = E.recommend(r, S.logs, S.profile, false);
    if (pastPlan()) rec.msg = `Terminaste las ${S.plan.nWeeks} semanas. ${rec.msg} Pedile a tu profe la próxima etapa.`;
    return rec;
  }

  // ------------------------------------------------------------------
  // HOY
  // ------------------------------------------------------------------
  function weekStart(d = new Date()) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    const wd = (x.getDay() + 6) % 7; // lunes = 0
    x.setDate(x.getDate() - wd); return x;
  }
  function sessionsInWeek(ws) {
    const we = new Date(ws); we.setDate(we.getDate() + 7);
    return S.logs.filter((l) => { const d = new Date(l.date); return d >= ws && d < we; });
  }
  function weekStreak() {
    let n = 0; const ws = weekStart();
    // la semana actual cuenta si ya hay sesiones; si no, empezamos por la anterior
    if (!sessionsInWeek(ws).length) ws.setDate(ws.getDate() - 7);
    while (sessionsInWeek(ws).length) { n++; ws.setDate(ws.getDate() - 7); }
    return n;
  }

  function weekPicker() {
    const n = S.plan.nWeeks; const w = S.plan.week || 1;
    return `<section class="card"><div class="row between"><h3>Semana de la rutina</h3><span class="pill">${w > n ? 'ciclo terminado' : `${w} de ${n}`}</span></div>
      <div class="chips">${[...Array(n)].map((_, i) => `<button class="wk ${w === i + 1 ? 'on' : ''}" data-action="set-week" data-w="${i + 1}">Sem ${i + 1}</button>`).join('')}
      <button class="wk ${w > n ? 'on' : ''}" data-action="set-week" data-w="${n + 1}">Seguir progresando</button></div>
      <p class="small muted">La semana avanza sola cuando completás los ${S.plan.days.length} días. También podés elegirla a mano.</p></section>`;
  }

  function viewHoy() {
    const p = S.profile; const plan = S.plan;
    const idx = (plan.nextIdx || 0) % plan.days.length;
    const day = plan.days[idx];
    const cycI = cyc();
    const ws = weekStart();
    const doneDays = new Set(S.logs.map((l) => dayKey(new Date(l.date))));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisWeek = sessionsInWeek(ws).length;
    const cal = [...Array(7)].map((_, i) => {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const wd = d.getDay();
      const planned = plan.weekdays.includes(wd);
      const done = doneDays.has(dayKey(d));
      const isToday = d.getTime() === today.getTime();
      return `<div class="cal-day ${planned ? 'planned' : ''} ${done ? 'done' : ''} ${isToday ? 'today' : ''}">
        <span>${E.DAY_NAMES[wd]}</span><b>${d.getDate()}</b><i>${done ? '✓' : planned ? '•' : ''}</i></div>`;
    }).join('');
    const isTrainingDay = plan.weekdays.includes(new Date().getDay());
    const trainedToday = doneDays.has(dayKey(new Date()));
    const hello = p.name ? `Hola, ${esc(p.name)}` : 'Hola';
    const items = cycI.isDeload ? day.items.map(E.deloadItem) : day.items.map(resolve);
    const tip = TIPS[Math.floor(Date.now() / 864e5) % TIPS.length];

    return `
    <header class="topbar">
      <div><small class="muted">${E.DAY_NAMES_LONG[new Date().getDay()]} ${new Date().getDate()}/${new Date().getMonth() + 1}</small><h1>${hello}</h1></div>
      <div class="badge" title="Semanas seguidas entrenando">🔥 ${weekStreak()} sem</div>
    </header>

    ${S.active ? `<button class="card resume" data-action="resume">
        <b>Tenés un entrenamiento en curso</b><span>${esc(S.plan.days[S.active.dayIdx]?.name || '')} — tocá para continuar</span></button>` : ''}

    <section class="card">
      <div class="row between"><h3>Esta semana</h3><span class="pill">${thisWeek}/${plan.daysPerWeek} sesiones</span></div>
      <div class="cal">${cal}</div>
      <p class="muted small">${trainedToday ? '¡Hoy ya entrenaste! Descansá, comé bien y dormí 7–9 h.' : isTrainingDay ? 'Hoy es día de entrenamiento.' : 'Hoy es día de descanso según tu plan (podés entrenar igual si te salteaste uno).'}</p>
    </section>

    ${cycI.isDeload ? `<section class="card warn"><b>Semana de descarga (${cycI.week}/${cycI.every})</b><p class="small">Esta semana bajamos series y cargas para que el cuerpo asimile lo entrenado. Es parte del plan: volvés más fuerte. Podés desactivarlo en Perfil.</p></section>` : plan.custom ? weekPicker() : `<p class="muted small center">Bloque de entrenamiento: semana ${cycI.week} de ${cycI.every} (la última es de descarga)</p>`}

    <section class="card next">
      <small class="muted">Próxima sesión · Día ${idx + 1} de ${plan.days.length}</small>
      <h2>${esc(day.name)}</h2>
      <p class="muted">${esc(day.focus)} · ~${E.dayMinutes({ items })} min</p>
      <ul class="ex-mini">
        ${items.map((it) => { const ex = BY_ID[it.exId]; return `<li><img src="${img(ex)}" alt="" loading="lazy"/><span>${esc(ex.n)}</span><em>${it.cardio ? `${it.lo} min` : `${it.sets}×${rng(it)}${ex.time ? ' s' : ''}${it.kgWeek != null ? ` · ${fmtN(it.kgWeek)} kg` : ''}`}</em></li>`; }).join('')}
      </ul>
      <button class="btn btn-primary btn-block big" data-action="start" data-day="${idx}">${S.active ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}</button>
      <button class="btn btn-ghost btn-block" data-action="pick-day">Elegir otro día de la rutina</button>
    </section>

    <section class="card tip"><b>💡 Consejo</b><p>${tip}</p></section>`;
  }

  const TIPS = [
    'La técnica va primero: si la última repetición se deforma, esa carga todavía es mucha.',
    'Dejar 1–3 repeticiones "en reserva" (RIR) da casi el mismo resultado que ir al fallo, con menos fatiga y riesgo.',
    'Para ganar músculo, apuntá a 1,6–2,2 g de proteína por kg de peso corporal por día, repartidos en 3–5 comidas.',
    'Dormir 7–9 horas mejora la recuperación, la fuerza y el control del apetito.',
    'Anotá cada serie: la progresión de cargas solo funciona si la app sabe qué hiciste.',
    'Calentá 5–8 minutos (bici o cinta suave + movilidad) y hacé series de aproximación en el primer ejercicio.',
    'Respirá: tomá aire antes de bajar, apretá el abdomen y soltalo al terminar el esfuerzo.',
    'La constancia gana: 3 sesiones por semana durante un año superan a 6 sesiones por un mes.',
    'Caminar 7.000–10.000 pasos por día suma mucho para la salud y para bajar grasa.',
    'Dolor articular punzante = frenar. Ardor muscular o cansancio = normal.',
    'Hidratate: tomá agua antes, durante y después de entrenar.',
    'Si te estancás 2–3 semanas en un ejercicio, una mini-descarga (−10 %) suele destrabarlo.'
  ];

  // ------------------------------------------------------------------
  // RUTINA
  // ------------------------------------------------------------------
  function viewRutina() {
    const plan = S.plan; const p = S.profile;
    const rd = plan.recDays;
    return `
    <header class="topbar"><div><small class="muted">Tu plan</small><h1>Rutina</h1></div></header>
    <section class="card">
      <h3>${esc(plan.split)}</h3>
      <p class="small">Días: <b>${plan.weekdays.map((d) => E.DAY_NAMES_LONG[d]).join(', ')}</b></p>
      <p class="muted small">${esc(rd.why)}</p>
      ${plan.custom ? `<p class="small">Mostrando la <b>semana ${Math.min(plan.week || 1, plan.nWeeks)}</b> de ${plan.nWeeks}. Tocá ✎ para ver o cambiar series, reps y kilos de cada semana.</p>` : `<p class="muted small">Objetivo: ${E.GOALS[p.goal]} · ${E.EQUIP[p.equipment]} · ${p.sessionMin} min por sesión</p>`}
      <div class="row gap wrap">
        ${plan.custom
          ? `<button class="btn btn-sm btn-ghost" data-action="use-auto">Volver a la rutina automática</button>`
          : `<button class="btn btn-sm" data-action="load-profe">Usar la rutina de mi profe</button>`}
      </div>
    </section>

    ${plan.days.map((d, di) => `
      <section class="card day">
        <div class="row between"><h3>Día ${di + 1}: ${esc(d.name)}</h3><span class="pill">~${E.dayMinutes({ items: d.items.map(resolve) })} min</span></div>
        <p class="muted small">${esc(d.focus)}</p>
        <ul class="plan-list">
          ${d.items.map((it, ii) => planRow(it, di, ii)).join('')}
        </ul>
        ${plan.custom ? `<button class="link small" data-action="add-ex" data-d="${di}">+ Agregar ejercicio</button>` : ''}
      </section>`).join('')}

    <section class="card">
      <h3>¿Cómo funciona la progresión?</h3>
      <ol class="small steps">
        <li><b>Doble progresión.</b> Cada ejercicio tiene un rango de repeticiones (p. ej., 6–10). Empezás en el piso del rango con un peso que te deje 1–3 repeticiones en reserva.</li>
        <li>Cada sesión intentás sumar repeticiones con el mismo peso.</li>
        <li>Cuando completás <b>todas las series en el tope del rango</b>, la app te sube el peso (2,5–5 kg en barra, la mancuerna siguiente, etc.) y volvés al piso del rango.</li>
        <li>Si quedás por debajo del rango dos sesiones seguidas, o pasás 3 sesiones sin mejorar, baja la carga ~10 % para destrabar.</li>
        <li>Cada ${E.deloadEvery(p)} semanas hay una <b>semana de descarga</b> (menos series y cargas) para recuperarte.</li>
      </ol>
      <p class="small muted"><b>RIR</b> = repeticiones en reserva: cuántas más podrías haber hecho con buena técnica. Al terminar cada ejercicio la app te pregunta tu RIR para afinar la progresión.</p>
    </section>

    <section class="card">
      <h3>Entrada en calor (8–10 min)</h3>
      <ol class="small steps">
        <li>5 min de cardio suave (bici, cinta, elíptico o soga).</li>
        <li>Movilidad: 10 círculos de brazos, 10 sentadillas sin peso, 10 bisagras de cadera, 10 rotaciones de torso, 8 zancadas con giro ("el mejor estiramiento del mundo").</li>
        <li>Series de aproximación del primer ejercicio (la app te las indica).</li>
      </ol>
      <h3>Vuelta a la calma (5 min)</h3>
      <p class="small">Caminata suave y estiramientos suaves de 20–30 s para los músculos trabajados. Respirá profundo.</p>
    </section>`;
  }

  function planRow(it0, di, ii) {
    const it = resolve(it0);
    const ex = BY_ID[it.exId];
    const label = it.cardio ? `${it.lo} min` : it0.weeks
      ? `${it.sets} × ${rng(it)}${sideTxt(it)}${it.kgWeek != null ? ` · ${fmtN(it.kgWeek)} kg${ex.tool === 'mancuernas' ? ' c/u' : ''}` : ''} · desc. ${restTxt(it.rest)}`
      : `${it.sets} × ${rng(it)} ${ex.time ? 's' : 'reps'} · RIR ${it.rir} · desc. ${restTxt(it.rest)}`;
    return `<li class="plan-row">
      <button class="thumb" data-action="tech" data-ex="${ex.id}" aria-label="Ver técnica"><img src="${img(ex)}" alt="" loading="lazy"/></button>
      <div class="plan-info" data-action="tech" data-ex="${ex.id}">
        <b>${esc(ex.n)}</b>
        <small>${label}</small>
        <small class="muted">${esc(ex.m)}</small>
      </div>
      <div class="plan-actions">
        ${it.cardio ? '' : `<button class="icon-btn" data-action="edit-item" data-d="${di}" data-i="${ii}" aria-label="Editar">✎</button>`}
        <button class="icon-btn" data-action="swap" data-d="${di}" data-i="${ii}" aria-label="Cambiar ejercicio">⇄</button>
      </div>
    </li>`;
  }

  function addExModal(di) {
    const list = Ex.EXERCISES.filter((e) => e.eq.includes(S.profile.equipment) && e.p !== 'cardio')
      .sort((a, b) => (PATTERN_NAMES[a.p] || '').localeCompare(PATTERN_NAMES[b.p] || '') || a.n.localeCompare(b.n));
    openModal(`<h3>Agregar ejercicio al día ${di + 1}</h3>
      <input id="exSearch" class="search" placeholder="Buscar (ej.: remo, bíceps, polea)"/>
      <ul class="alt-list" id="exList">${list.map((a) => `
        <li data-q="${esc((a.n + ' ' + a.m + ' ' + (PATTERN_NAMES[a.p] || '')).toLowerCase())}"><button data-action="do-add" data-d="${di}" data-to="${a.id}">
          <img src="${img(a)}" alt="" loading="lazy"/><span><b>${esc(a.n)}</b><small>${esc(PATTERN_NAMES[a.p] || '')} · ${esc(a.m)}</small></span></button></li>`).join('')}</ul>`, 'tall');
  }

  function editItemModal(di, ii) {
    const it = S.plan.days[di].items[ii]; const ex = BY_ID[it.exId];
    if (it.weeks) {
      openModal(`
        <h3>${esc(ex.n)}</h3>
        <form id="editWeeksForm" data-d="${di}" data-i="${ii}" class="form">
          <table class="wk-table"><thead><tr><th>Sem</th><th>Series</th><th>Reps</th><th>Kg${ex.tool === 'mancuernas' ? ' c/u' : ''}</th></tr></thead><tbody>
          ${it.weeks.map((w, k) => `<tr><td>${k + 1}</td>
            <td><input name="s${k}" inputmode="numeric" value="${w.sets}"/></td>
            <td><input name="r${k}" inputmode="numeric" value="${w.reps}"/></td>
            <td><input name="k${k}" inputmode="decimal" value="${w.kg != null ? fmtN(w.kg) : ''}"/></td></tr>`).join('')}
          </tbody></table>
          <label class="check-inline"><input type="checkbox" name="perSide" ${it.perSide ? 'checked' : ''}/> Repeticiones por lado (ejercicio a un brazo/pierna)</label>
          <label class="field"><span>Descanso entre series</span>
            <select name="rest">${[30, 45, 60, 75, 90, 120, 150, 180, 240].map((x) => `<option value="${x}" ${it.rest === x ? 'selected' : ''}>${restTxt(x)}</option>`).join('')}</select>
          </label>
          <button class="btn btn-primary btn-block" type="submit">Guardar</button>
          <button class="btn btn-ghost btn-block danger" type="button" data-action="del-item" data-d="${di}" data-i="${ii}">Quitar ejercicio de la rutina</button>
        </form>`);
      return;
    }
    openModal(`
      <h3>${esc(ex.n)}</h3>
      <form id="editItemForm" data-d="${di}" data-i="${ii}" class="form">
        <div class="grid2">
          <label class="field"><span>Series</span><input name="sets" type="number" min="1" max="8" value="${it.sets}"/></label>
          <label class="field"><span>RIR objetivo</span><input name="rir" type="number" min="0" max="5" value="${it.rir}"/></label>
          <label class="field"><span>${ex.time ? 'Seg. mín.' : 'Reps mín.'}</span><input name="lo" type="number" min="1" max="120" value="${it.lo}"/></label>
          <label class="field"><span>${ex.time ? 'Seg. máx.' : 'Reps máx.'}</span><input name="hi" type="number" min="1" max="120" value="${it.hi}"/></label>
        </div>
        <label class="field"><span>Descanso entre series</span>
          <select name="rest">${[30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((s) => `<option value="${s}" ${it.rest === s ? 'selected' : ''}>${restTxt(s)}</option>`).join('')}</select>
        </label>
        <p class="small muted">Guía de descanso: 2–3 min en básicos pesados (sentadilla, banca, peso muerto), 60–90 s en accesorios.</p>
        <button class="btn btn-primary btn-block" type="submit">Guardar</button>
      </form>`);
  }

  function swapModal(ctx) {
    // ctx: { d, i } en el plan  o  { w: idx } en el entrenamiento
    const it = ctx.w != null ? S.active.items[ctx.w] : S.plan.days[ctx.d].items[ctx.i];
    const ex = BY_ID[it.exId];
    const alts = E.alternatives(ex.p, S.profile, ex.id);
    openModal(`
      <h3>Cambiar ${esc(ex.n)}</h3>
      <p class="small muted">Alternativas del mismo patrón (${esc(PATTERN_NAMES[ex.p])}) disponibles con tu equipamiento. Útil si la máquina está ocupada o algo te molesta.</p>
      ${alts.length ? `<ul class="alt-list">${alts.map((a) => `
        <li><button data-action="do-swap" data-to="${a.id}" ${ctx.w != null ? `data-w="${ctx.w}"` : `data-d="${ctx.d}" data-i="${ctx.i}"`}>
          <img src="${img(a)}" alt="" loading="lazy"/><span><b>${esc(a.n)}</b><small>${esc(a.m)}</small></span></button></li>`).join('')}</ul>`
        : '<p>No hay alternativas para tu equipamiento y zonas a cuidar.</p>'}`);
  }

  // Al cambiar un ejercicio de una rutina propia se conservan series/reps por semana (los kg no, porque es otro ejercicio).
  function keepCustom(ni, old) {
    if (!old.weeks) return ni;
    return { ...ni, perSide: old.perSide, weeks: old.weeks.map((w) => ({ ...w, kg: null })) };
  }

  function doSwap(btn) {
    const to = btn.dataset.to; const ex = BY_ID[to];
    const g = E.goalParams(S.profile);
    if (btn.dataset.w != null) {
      const wi = +btn.dataset.w; const it = S.active.items[wi];
      let ni = { ...E.makeItem(ex, it.role, g, S.profile), sets: it.sets, rest: it.rest };
      if (it.weeks) ni = { ...ni, lo: it.lo, hi: it.hi };
      if (S.active.deload) Object.assign(ni, E.deloadItem(ni));
      ni.rec = E.recommend(ni, S.logs, S.profile, S.active.deload);
      ni.rows = buildRows(ni);
      S.active.items[wi] = ni;
      // también en el plan, para las próximas sesiones
      const pi = S.plan.days[S.active.dayIdx].items.findIndex((x) => x.exId === it.exId);
      if (pi >= 0) { const old = S.plan.days[S.active.dayIdx].items[pi]; S.plan.days[S.active.dayIdx].items[pi] = keepCustom({ ...E.makeItem(ex, old.role, g, S.profile), sets: old.sets, rest: old.rest }, old); }
      save(); closeModal(); renderWorkout();
    } else {
      const d = +btn.dataset.d; const i = +btn.dataset.i; const old = S.plan.days[d].items[i];
      S.plan.days[d].items[i] = keepCustom({ ...E.makeItem(ex, old.role, g, S.profile), sets: old.sets, rest: old.rest }, old);
      save(); closeModal(); render();
    }
    toast(`Cambiado por ${ex.n}`);
  }

  // ------------------------------------------------------------------
  // Técnica (imágenes + video)
  // ------------------------------------------------------------------
  function ytId(url) {
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  function techModal(id) {
    const ex = BY_ID[id];
    const vid = S.videos[id];
    const q = encodeURIComponent(ex.yt);
    const qEn = encodeURIComponent(`${ex.img.replace(/_/g, ' ').replace(/ - /g, ' ')} proper form`);
    openModal(`
      <h3>${esc(ex.n)}</h3>
      <p class="small muted">${esc(ex.m)}</p>
      <div class="tech-imgs" id="techImgs">
        <figure><img src="${img(ex, 0)}" alt="${esc(ex.n)}: posición inicial"/><figcaption>Inicio</figcaption></figure>
        <figure><img src="${img(ex, 1)}" alt="${esc(ex.n)}: posición final"/><figcaption>Final</figcaption></figure>
      </div>
      <div class="tech-anim"><img id="techAnim" src="${img(ex, 0)}" alt="Animación del movimiento"/><span>Movimiento</span></div>

      <h4>Video</h4>
      ${vid ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(vid)}?rel=0" title="Video de técnica" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
        <button class="btn btn-ghost btn-sm" data-action="video-del" data-ex="${ex.id}">Quitar este video</button>` : ''}
      <div class="row wrap gap">
        <a class="btn btn-yt" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ Videos en YouTube (español)</a>
        <a class="btn btn-ghost btn-sm" href="https://www.youtube.com/results?search_query=${qEn}" target="_blank" rel="noopener">En inglés</a>
      </div>
      <form id="videoForm" data-ex="${ex.id}" class="video-form">
        <input name="url" type="url" placeholder="Pegá el link de un video que te guste" />
        <button class="btn btn-sm" type="submit">Guardar</button>
      </form>
      <p class="small muted">Elegí un video de un canal confiable (profesor de educación física, kinesiólogo o entrenador certificado) y guardalo: queda incrustado acá para verlo sin salir de la app.</p>

      <h4>Claves de técnica</h4>
      <ol class="tips">${ex.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
      <h4>Errores frecuentes</h4>
      <ul class="errs">${ex.errs.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="credit">Imágenes: Free Exercise DB (dominio público).</p>`, 'tall');
    let f = 0;
    clearInterval(openModal._anim);
    openModal._anim = setInterval(() => {
      const el = $('#techAnim'); if (!el) { clearInterval(openModal._anim); return; }
      f = 1 - f; el.src = img(ex, f);
    }, 1100);
  }

  // ------------------------------------------------------------------
  // ENTRENAMIENTO
  // ------------------------------------------------------------------
  function buildRows(it) {
    const ex = BY_ID[it.exId];
    if (it.cardio) return [{ w: null, reps: it.lo, done: false }];
    return [...Array(it.sets)].map(() => ({ w: it.rec && it.rec.w != null ? it.rec.w : null, reps: null, done: false }));
  }

  function startWorkout(dayIdx) {
    if (S.active) { openWorkout(); return; }
    audio();
    const cy = cyc();
    const day = S.plan.days[dayIdx];
    const items = day.items.map((it0) => {
      const it = cy.isDeload ? E.deloadItem(it0) : { ...resolve(it0) };
      it.rec = it0.weeks ? customRec(it) : E.recommend(it, S.logs, S.profile, cy.isDeload);
      it.rows = buildRows(it);
      return it;
    });
    S.active = { id: uid(), dayIdx, startedAt: Date.now(), deload: cy.isDeload, items, week: S.plan.custom ? (S.plan.week || 1) : null, planId: S.plan.id || null };
    save();
    openWorkout();
  }

  function openWorkout() {
    $('#workout').hidden = false;
    document.body.classList.add('no-scroll');
    keepAwake(true);
    renderWorkout();
    if (S.active.timer && S.active.timer.endAt > Date.now()) {
      const t = S.active.timer;
      startTimer((t.endAt - Date.now()) / 1000, t.label, t.next, t.mode);
      timer.total = t.total;
    }
  }

  function closeWorkout() {
    $('#workout').hidden = true;
    document.body.classList.remove('no-scroll');
    keepAwake(false);
  }

  let elapsedInt = null;
  function renderWorkout() {
    const a = S.active; if (!a) return;
    const day = S.plan.days[a.dayIdx];
    const doneSets = a.items.reduce((s, it) => s + it.rows.filter((r) => r.done).length, 0);
    const totalSets = a.items.reduce((s, it) => s + it.rows.length, 0);
    const scroll = $('#workout .w-body')?.scrollTop || 0;
    $('#workout').innerHTML = `
      <header class="w-head">
        <button class="icon-btn" data-action="w-min" aria-label="Minimizar">⌄</button>
        <div class="w-title"><b>${esc(day.name)}</b><small><span id="elapsed">0:00</span> · ${doneSets}/${totalSets} series${a.deload ? ' · descarga' : ''}</small></div>
        <button class="btn btn-primary btn-sm" data-action="w-finish">Terminar</button>
      </header>
      <div class="w-progress"><div style="width:${totalSets ? (doneSets / totalSets) * 100 : 0}%"></div></div>
      <div class="w-body">
        <div class="card warmup"><b>Entrada en calor</b><p class="small">5 min de cardio suave + movilidad articular. Después, series de aproximación del primer ejercicio.</p></div>
        ${a.items.map((it, i) => workoutCard(it, i)).join('')}
        <button class="btn btn-primary btn-block big" data-action="w-finish">Terminar entrenamiento</button>
        <button class="btn btn-ghost btn-block" data-action="w-cancel">Descartar entrenamiento</button>
        <div style="height:180px"></div>
      </div>`;
    $('#workout .w-body').scrollTop = scroll;
    clearInterval(elapsedInt);
    const upd = () => { const el = $('#elapsed'); if (el && S.active) el.textContent = mmss((Date.now() - S.active.startedAt) / 1000); };
    upd(); elapsedInt = setInterval(upd, 1000);
  }

  function workoutCard(it, i) {
    const ex = BY_ID[it.exId];
    const rec = it.rec || {};
    const hist = E.historyFor(it.exId, S.logs);
    const last = hist[0];
    const allDone = it.rows.every((r) => r.done);
    const unit = ex.time ? 's' : 'reps';
    const kindCls = { up: 'up', down: 'down', deload: 'down', start: 'start', keep: 'keep', cardio: 'keep' }[rec.kind] || 'keep';
    const warm = it.role === 'main' && rec.w ? E.warmupSets(rec.w, ex) : [];
    const wLabel = ex.r == null ? '' : (ex.tool === 'mancuernas' ? 'kg c/u' : 'kg');

    let rowsHtml;
    if (it.cardio) {
      const r = it.rows[0];
      rowsHtml = `<div class="set-row ${r.done ? 'done' : ''}">
        <span class="set-n">1</span>
        <label class="set-in wide"><input data-field="reps" data-i="${i}" data-s="0" inputmode="numeric" value="${r.reps ?? ''}"/><small>min</small></label>
        <button class="check" data-action="set-done" data-i="${i}" data-s="0" aria-label="Completar">✓</button></div>`;
    } else {
      rowsHtml = it.rows.map((r, s) => `
        <div class="set-row ${r.done ? 'done' : ''}">
          <span class="set-n">${s + 1}</span>
          ${ex.r != null ? `<label class="set-in"><input data-field="w" data-i="${i}" data-s="${s}" inputmode="decimal" value="${r.w != null ? fmtN(r.w) : ''}" placeholder="kg"/><small>${wLabel}</small></label>` : '<span class="set-bw">corporal</span>'}
          <label class="set-in"><input data-field="reps" data-i="${i}" data-s="${s}" inputmode="numeric" value="${r.reps ?? ''}" placeholder="${rng(it)}"/><small>${unit}</small></label>
          ${ex.time && !r.done ? `<button class="icon-btn" data-action="time-set" data-i="${i}" data-s="${s}" aria-label="Cronometrar">⏱</button>` : ''}
          <button class="check" data-action="set-done" data-i="${i}" data-s="${s}" aria-label="${r.done ? 'Desmarcar' : 'Completar'} serie">✓</button>
        </div>`).join('');
    }

    return `
    <section class="card w-ex ${allDone ? 'complete' : ''}" id="wex-${i}">
      <div class="w-ex-head">
        <button class="thumb" data-action="tech" data-ex="${ex.id}" aria-label="Ver técnica"><img src="${img(ex)}" alt="" loading="lazy"/><span>Técnica</span></button>
        <div>
          <b>${esc(ex.n)}</b>
          <small>${it.cardio ? `${it.lo} min` : `${it.sets} × ${rng(it)} ${unit}${sideTxt(it)}${it.weeks ? '' : ` · RIR ${it.rir}`} · descanso ${restTxt(it.rest)}`}</small>
        </div>
        <button class="icon-btn" data-action="swap-w" data-w="${i}" aria-label="Cambiar ejercicio">⇄</button>
      </div>
      ${rec.msg ? `<div class="rec ${kindCls}">${rec.w != null ? `<b>${kg(rec.w)}${rec.perHand ? ' por mancuerna' : ''}</b> · ` : ''}${esc(rec.msg)}</div>` : ''}
      ${last && !it.cardio ? `<p class="small muted">Última vez (${dateShort(last.date)}): ${last.sets.map((s) => (s.w ? `${fmtN(s.w)}×${s.reps}` : `${s.reps}`)).join(' · ')}${last.rir != null ? ` · RIR ${last.rir}` : ''}</p>` : ''}
      ${warm.length ? `<p class="small warm">Aproximación: ${warm.map((w) => `${fmtN(w.w)} kg × ${w.reps}`).join(' → ')}</p>` : ''}
      ${ex.tool === 'barra' && rec.w ? `<button class="link small" data-action="plates" data-w="${rec.w}">🏋 ¿Qué discos pongo?</button>` : ''}
      <div class="sets">${rowsHtml}</div>
      ${allDone && !it.cardio ? `
        <div class="rir-q"><small>¿Cuántas reps más podrías haber hecho en la última serie?</small>
          <div class="rir-chips">${[0, 1, 2, 3, 4].map((v) => `<button class="${it.rirLast === v ? 'on' : ''}" data-action="rir" data-i="${i}" data-v="${v}">${v === 4 ? '4+' : v}</button>`).join('')}</div>
        </div>` : ''}
      ${!it.cardio && !allDone ? `<div class="row gap"><button class="link small" data-action="add-set" data-i="${i}">+ Serie</button>${it.rows.length > 1 ? `<button class="link small" data-action="del-set" data-i="${i}">− Serie</button>` : ''}</div>` : ''}
    </section>`;
  }

  function nextSetInfo(fromI) {
    const a = S.active;
    for (let i = fromI; i < a.items.length; i++) {
      const it = a.items[i]; const s = it.rows.findIndex((r) => !r.done);
      if (s >= 0) {
        const ex = BY_ID[it.exId]; const r = it.rows[s];
        return `Siguiente: <b>${esc(ex.n)}</b> — serie ${s + 1}/${it.rows.length}${r.w != null ? ` · ${kg(r.w)}` : ''} × ${it.cardio ? `${it.lo} min` : rng(it) + sideTxt(it)}`;
      }
    }
    return 'Era la última serie. ¡Terminá el entrenamiento!';
  }

  function setDone(i, s, fromTimer = false) {
    const a = S.active; const it = a.items[i]; const r = it.rows[s]; const ex = BY_ID[it.exId];
    if (r.done && !fromTimer) { r.done = false; save(); renderWorkout(); return; }
    if (r.reps == null || r.reps === '') r.reps = ex.time ? it.lo : it.cardio ? it.lo : it.lo;
    if (ex.r != null && (r.w == null)) { toast('Cargá el peso usado'); return; }
    r.done = true;
    // Propagar el peso a las series siguientes que no estén hechas
    for (let k = s + 1; k < it.rows.length; k++) if (!it.rows[k].done) it.rows[k].w = r.w;
    save();
    vibrate(40);
    const remaining = a.items.some((x) => x.rows.some((y) => !y.done));
    const isLastOfEx = it.rows.every((y) => y.done);
    renderWorkout();
    if (!it.cardio && remaining) {
      // Entre ejercicios el descanso es el del ejercicio que terminó (mínimo 60 s)
      const rest = isLastOfEx ? Math.max(60, Math.min(it.rest, 120)) : it.rest;
      startTimer(rest, isLastOfEx ? 'Cambio de ejercicio' : 'Descanso', nextSetInfo(isLastOfEx ? i + 1 : i));
    }
    if (isLastOfEx) {
      const card = $(`#wex-${i}`); card && card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (!remaining) { toast('¡Completaste todas las series! 💪', 3000); }
  }

  function timeSet(i, s) {
    const it = S.active.items[i]; const ex = BY_ID[it.exId];
    const target = it.rows[s].reps || it.lo;
    let count = 3;
    toast('Preparate… 3');
    beep(660, 0.1);
    const c = setInterval(() => {
      count--;
      if (count > 0) { toast(`Preparate… ${count}`); beep(660, 0.1); return; }
      clearInterval(c);
      beep(1046, 0.25);
      startTimer(target, `${ex.n}: ¡aguantá!`, `Objetivo: ${target} s`, 'work', () => {
        const r = S.active && S.active.items[i] && S.active.items[i].rows[s];
        if (!r) return;
        r.reps = target; setDone(i, s, true);
      });
    }, 1000);
  }

  function finishWorkout() {
    const a = S.active;
    const entries = a.items.map((it) => ({
      exId: it.exId,
      sets: it.rows.filter((r) => r.done).map((r) => ({ w: r.w, reps: +r.reps })),
      rir: it.rirLast != null ? it.rirLast : null,
      lo: it.lo, hi: it.hi, cardio: !!it.cardio
    })).filter((e) => e.sets.length);
    if (!entries.length) {
      if (!confirm('No completaste ninguna serie. ¿Descartar el entrenamiento?')) return;
      S.active = null; save(); stopTimer(); closeWorkout(); render(); return;
    }
    // Récords (1RM estimado)
    const prs = [];
    entries.forEach((e) => {
      const ex = BY_ID[e.exId]; if (ex.r == null || e.cardio) return;
      const best = Math.max(...e.sets.map((s) => E.e1rm(s.w, s.reps)));
      const prevBest = Math.max(0, ...E.historyFor(e.exId, S.logs).flatMap((h) => h.sets.map((s) => E.e1rm(s.w || 0, s.reps))));
      if (prevBest > 0 && best > prevBest + 0.01) prs.push({ n: ex.n, v: best, prev: prevBest });
    });
    const volume = entries.reduce((s, e) => s + e.sets.reduce((x, y) => x + (y.w || 0) * y.reps * (BY_ID[e.exId].tool === 'mancuernas' ? 2 : 1), 0), 0);
    const durationSec = Math.round((Date.now() - a.startedAt) / 1000);
    const day = S.plan.days[a.dayIdx];
    S.logs.push({ id: a.id, date: new Date().toISOString(), dayIdx: a.dayIdx, dayName: day.name, deload: a.deload, durationSec, volume: Math.round(volume), entries, week: a.week, planId: a.planId });
    S.plan.nextIdx = (a.dayIdx + 1) % S.plan.days.length;
    let weekMsg = '';
    if (S.plan.custom && a.week != null && a.week === (S.plan.week || 1) && a.week <= S.plan.nWeeks) {
      const doneIdx = new Set(S.logs.filter((l) => l.planId === S.plan.id && l.week === a.week).map((l) => l.dayIdx));
      if (S.plan.days.every((_, i) => doneIdx.has(i))) {
        S.plan.week = a.week + 1; S.plan.nextIdx = 0;
        weekMsg = S.plan.week > S.plan.nWeeks
          ? `<p><b>¡Completaste las ${S.plan.nWeeks} semanas de tu rutina!</b> Desde ahora la app sugiere cargas con progresión automática. Pedile a tu profe la próxima etapa.</p>`
          : `<p><b>¡Semana ${a.week} completa!</b> Pasás a la semana ${S.plan.week}.</p>`;
      }
    }
    S.active = null; save();
    stopTimer(); closeWorkout(); tab = 'hoy'; render();
    const setsN = entries.reduce((s, e) => s + e.sets.length, 0);
    openModal(`
      <div class="summary">
        <div class="big-emoji">🏆</div>
        <h2>¡Entrenamiento completado!</h2>
        <div class="stats">
          <div><b>${mmss(durationSec)}</b><small>duración</small></div>
          <div><b>${setsN}</b><small>series</small></div>
          <div><b>${Math.round(volume).toLocaleString('es-AR')}</b><small>kg de volumen</small></div>
        </div>
        ${prs.length ? `<h4>Nuevos récords (1RM estimado)</h4><ul class="prs">${prs.map((p) => `<li>⭐ ${esc(p.n)}: ${kg(Math.round(p.v * 10) / 10)} <small class="muted">(antes ${kg(Math.round(p.prev * 10) / 10)})</small></li>`).join('')}</ul>` : ''}
        ${weekMsg}
        <p class="small muted">La próxima vez la app ajusta las cargas según lo que registraste. Ahora: proteína, agua y buen descanso.</p>
        <button class="btn btn-primary btn-block" data-action="modal-close">Listo</button>
      </div>`);
    finishSound();
  }

  // ------------------------------------------------------------------
  // PROGRESO
  // ------------------------------------------------------------------
  let chartEx = null;
  function loggedExercises() {
    const set = new Map();
    S.logs.forEach((l) => l.entries.forEach((e) => { const ex = BY_ID[e.exId]; if (ex && ex.r != null && !e.cardio) set.set(ex.id, ex.n); }));
    return [...set.entries()];
  }

  function viewProgreso() {
    const logs = S.logs;
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    const monthN = logs.filter((l) => new Date(l.date) >= month).length;
    const totalVol = logs.reduce((s, l) => s + (l.volume || 0), 0);
    const exs = loggedExercises();
    if (!chartEx || !exs.some(([id]) => id === chartEx)) chartEx = exs[0] ? exs[0][0] : null;
    const prRows = exs.map(([id, n]) => {
      let best = null;
      logs.forEach((l) => l.entries.forEach((e) => {
        if (e.exId !== id) return;
        e.sets.forEach((s) => { const v = E.e1rm(s.w || 0, s.reps); if (!best || v > best.v) best = { v, w: s.w, reps: s.reps, date: l.date }; });
      }));
      return { n, ...best };
    }).filter((x) => x.v).sort((a, b) => b.v - a.v);

    return `
    <header class="topbar"><div><small class="muted">Tus números</small><h1>Progreso</h1></div></header>
    <section class="stats-grid">
      <div class="card stat"><b>${logs.length}</b><small>entrenamientos</small></div>
      <div class="card stat"><b>${monthN}</b><small>este mes</small></div>
      <div class="card stat"><b>${weekStreak()}</b><small>semanas seguidas</small></div>
      <div class="card stat"><b>${(totalVol / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} t</b><small>volumen total</small></div>
    </section>

    <section class="card">
      <h3>Fuerza por ejercicio</h3>
      ${exs.length ? `
        <select id="chartSel">${exs.map(([id, n]) => `<option value="${id}" ${id === chartEx ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <div id="chartEx" class="chart"></div>
        <p class="small muted">Línea: 1RM estimado (fórmula de Epley). Puntos: mayor peso usado en la sesión.</p>`
        : '<p class="muted">Cuando registres tus primeros entrenamientos vas a ver acá tu evolución.</p>'}
    </section>

    ${prRows.length ? `<section class="card"><h3>Mejores marcas</h3><ul class="pr-list">${prRows.map((r) => `<li><span>${esc(r.n)}</span><b>${kg(r.w)} × ${r.reps}</b><small class="muted">1RM est. ${kg(Math.round(r.v * 2) / 2)}</small></li>`).join('')}</ul></section>` : ''}

    <section class="card">
      <h3>Peso corporal</h3>
      <form id="bwForm" class="row gap">
        <input name="kg" inputmode="decimal" placeholder="Peso de hoy (kg)" />
        <button class="btn btn-sm" type="submit">Registrar</button>
      </form>
      <div id="chartBw" class="chart"></div>
      <p class="small muted">Pesate en las mismas condiciones (en ayunas, al levantarte). Mirá la tendencia semanal, no el día a día.</p>
    </section>

    <section class="card">
      <h3>Historial</h3>
      ${logs.length ? `<ul class="hist">${logs.slice().reverse().map((l) => `
        <li><details><summary><b>${dateShort(l.date)}</b> ${esc(l.dayName)}${l.deload ? ' <span class="pill">descarga</span>' : ''}<small>${mmss(l.durationSec)} · ${l.entries.reduce((s, e) => s + e.sets.length, 0)} series</small></summary>
          <ul>${l.entries.map((e) => { const ex = BY_ID[e.exId]; return `<li>${esc(ex ? ex.n : e.exId)}: ${e.cardio ? `${e.sets[0].reps} min` : e.sets.map((s) => (s.w ? `${fmtN(s.w)}×${s.reps}` : s.reps)).join(' · ')}${e.rir != null ? ` <small class="muted">RIR ${e.rir}</small>` : ''}</li>`; }).join('')}</ul>
          <button class="link danger small" data-action="del-log" data-id="${l.id}">Eliminar este registro</button>
        </details></li>`).join('')}</ul>` : '<p class="muted">Todavía no hay entrenamientos registrados.</p>'}
    </section>

    <section class="card">
      <h3>Copia de seguridad</h3>
      <p class="small muted">Los datos se guardan solo en este dispositivo. Exportá un archivo para no perderlos o pasarlos a otro celular.</p>
      <div class="row gap wrap">
        <button class="btn btn-sm" data-action="export">Exportar datos</button>
        <label class="btn btn-sm btn-ghost">Importar<input type="file" id="importFile" accept="application/json,.json" hidden/></label>
      </div>
    </section>`;
  }

  function lineChart(el, pts, opts = {}) {
    if (!el) return;
    if (pts.length < 2) { el.innerHTML = `<p class="muted small">${pts.length ? 'Necesitás al menos 2 registros para ver la curva.' : 'Sin datos todavía.'}</p>`; return; }
    const W = 340; const H = 170; const P = { l: 38, r: 10, t: 12, b: 24 };
    const xs = pts.map((p) => p.x); const ys = pts.flatMap((p) => [p.y, p.y2].filter((v) => v != null));
    const x0 = Math.min(...xs); const x1 = Math.max(...xs);
    let y0 = Math.min(...ys); let y1 = Math.max(...ys);
    const pad = (y1 - y0) * 0.15 || 2; y0 -= pad; y1 += pad;
    const X = (x) => P.l + ((x - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
    const Y = (y) => H - P.b - ((y - y0) / (y1 - y0 || 1)) * (H - P.t - P.b);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    const area = `${path} L${X(x1).toFixed(1)},${H - P.b} L${X(x0).toFixed(1)},${H - P.b} Z`;
    const ticks = [y0 + pad, (y0 + y1) / 2, y1 - pad].map((v) => `<g><line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${P.l - 6}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}</text></g>`).join('');
    const dots2 = pts.filter((p) => p.y2 != null).map((p) => `<circle cx="${X(p.x)}" cy="${Y(p.y2)}" r="3" class="dot2"/>`).join('');
    const d = (t) => { const z = new Date(t); return `${z.getDate()}/${z.getMonth() + 1}`; };
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Gráfico')}">
      ${ticks}
      <path d="${area}" class="area"/>
      <path d="${path}" class="line"/>
      ${pts.map((p) => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3.5" class="dot"><title>${d(p.x)}: ${fmtN(Math.round(p.y * 10) / 10)} kg</title></circle>`).join('')}
      ${dots2}
      <text x="${P.l}" y="${H - 6}">${d(x0)}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end">${d(x1)}</text>
    </svg>`;
  }

  function drawCharts() {
    if (chartEx) {
      const pts = [];
      S.logs.forEach((l) => {
        const e = l.entries.find((x) => x.exId === chartEx); if (!e || !e.sets.length) return;
        pts.push({ x: new Date(l.date).getTime(), y: Math.max(...e.sets.map((s) => E.e1rm(s.w || 0, s.reps))), y2: Math.max(...e.sets.map((s) => s.w || 0)) });
      });
      lineChart($('#chartEx'), pts, { label: '1RM estimado' });
    }
    lineChart($('#chartBw'), S.bw.map((b) => ({ x: new Date(b.date).getTime(), y: b.kg })), { label: 'Peso corporal' });
  }

  // ------------------------------------------------------------------
  // PERFIL
  // ------------------------------------------------------------------
  function viewPerfil() {
    const p = S.profile; const m = E.metrics(p); const st = S.settings;
    const parqWarn = (p.parq || []).length || p.age >= 45;
    return `
    <header class="topbar"><div><small class="muted">Configuración</small><h1>Perfil</h1></div></header>
    ${parqWarn ? `<section class="card warn"><b>Recomendación médica</b><p class="small">${(p.parq || []).length ? 'Marcaste al menos una respuesta afirmativa en el chequeo de salud.' : 'Por tu edad,'} conviene hacer un chequeo médico (apto físico con electrocardiograma / ergometría según indique el profesional) antes de entrenar intensamente.</p></section>` : ''}
    <section class="card">
      <h3>Tus indicadores</h3>
      <div class="metrics">
        <div><small>IMC</small><b>${fmtN(m.bmi)}</b><em>${m.bmiCat}</em></div>
        <div><small>Metabolismo basal</small><b>${m.bmr}</b><em>kcal/día</em></div>
        <div><small>Gasto estimado</small><b>${m.tdee}</b><em>kcal/día</em></div>
        <div><small>Calorías objetivo</small><b>${m.kcal}</b><em>${m.kcalNote}</em></div>
        <div><small>Proteína</small><b>${m.protLo}–${m.protHi} g</b><em>por día</em></div>
        <div><small>Agua</small><b>${fmtN(m.water)} L</b><em>por día aprox.</em></div>
        <div><small>FC máx. estimada</small><b>${m.maxHR}</b><em>lpm</em></div>
        <div><small>Cardio zona 2</small><b>${m.z2Lo}–${m.z2Hi}</b><em>lpm</em></div>
      </div>
      <p class="small muted">Estimaciones con fórmulas estándar (Mifflin-St Jeor, Tanaka). El IMC no distingue músculo de grasa. Para un plan nutricional, consultá a un/a nutricionista.</p>
    </section>

    <section class="card">
      <h3>Sonido y avisos</h3>
      <label class="switch"><input type="checkbox" data-setting="sound" ${st.sound ? 'checked' : ''}/><span>Sonido al terminar el descanso</span></label>
      <label class="field"><span>Volumen</span><input type="range" min="0.05" max="1" step="0.05" data-setting="volume" value="${st.volume}"/></label>
      <button class="btn btn-sm btn-ghost" data-action="test-sound">Probar sonido</button>
      <label class="switch"><input type="checkbox" data-setting="vibrate" ${st.vibrate ? 'checked' : ''}/><span>Vibración</span></label>
      <label class="switch"><input type="checkbox" data-setting="notify" ${st.notify ? 'checked' : ''}/><span>Notificación si la app está en segundo plano</span></label>
      <label class="switch"><input type="checkbox" data-setting="wakeLock" ${st.wakeLock ? 'checked' : ''}/><span>Mantener la pantalla encendida mientras entrenás</span></label>
      <label class="switch"><input type="checkbox" data-setting="autoDeload" ${p.autoDeload !== false ? 'checked' : ''}/><span>Semanas de descarga automáticas (cada ${E.deloadEvery(p)} semanas)</span></label>
      <p class="small muted">En iPhone, el sonido no se escucha si el teléfono está en modo silencio.</p>
    </section>

    <section class="card"><h3>Editar datos y objetivos</h3>${profileForm(p, false)}</section>

    <section class="card">
      <h3>Contraseña</h3>
      ${S.lock ? `<p class="small">🔒 La app pide contraseña al abrirse y después de ${LOCK_AFTER_MIN} minutos en segundo plano.</p>` : '<p class="small muted">Protegé tus datos con una contraseña o PIN: se pide cada vez que abrís la app.</p>'}
      <form id="pwForm" class="form">
        ${S.lock ? '<label class="field"><span>Contraseña actual</span><input name="cur" type="password" autocomplete="current-password" required/></label>' : ''}
        <label class="field"><span>${S.lock ? 'Nueva contraseña' : 'Contraseña o PIN'} (mín. 4 caracteres)</span><input name="pw" type="password" autocomplete="new-password" minlength="4" ${S.lock ? '' : 'required'}/></label>
        <label class="field"><span>Repetila</span><input name="pw2" type="password" autocomplete="new-password"/></label>
        <div class="row gap wrap">
          <button class="btn btn-sm btn-primary" type="submit">${S.lock ? 'Cambiar contraseña' : 'Activar contraseña'}</button>
          ${S.lock ? '<button class="btn btn-sm danger" type="button" data-action="pw-remove">Quitar contraseña</button>' : ''}
        </div>
      </form>
      <p class="small muted">Si la olvidás, la única forma de entrar es borrar los datos de la app: exportá una copia de seguridad cada tanto.</p>
    </section>

    <section class="card">
      <h3>Reiniciar</h3>
      <button class="btn btn-sm btn-ghost" data-action="restart-cycle">Reiniciar bloque (semana 1)</button>
      <button class="btn btn-sm danger" data-action="reset-all">Borrar todos los datos</button>
    </section>
    <p class="disclaimer">Rutina Gim es una herramienta orientativa. No reemplaza la evaluación médica ni la supervisión de un profesional del entrenamiento.</p>`;
  }

  // ------------------------------------------------------------------
  // Eventos
  // ------------------------------------------------------------------
  document.addEventListener('click', (ev) => {
    const tabBtn = ev.target.closest('[data-tab]');
    if (tabBtn) { tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0); return; }
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const act = el.dataset.action;
    const d = el.dataset;
    switch (act) {
      case 'modal-close': closeModal(); break;
      case 'load-profe':
        if (S.active) { toast('Terminá o descartá el entrenamiento en curso primero'); break; }
        if (!confirm('Se cargará la rutina de tu profe (3 días, 4 semanas) con sus series, repeticiones y kilos. Tu rutina automática queda guardada para volver cuando quieras. ¿Continuar?')) break;
        S.autoPlan = S.plan; S.plan = S.customPlan || buildCustomPlan(PROFE_PLAN); S.customPlan = null; save(); render(); toast('Rutina del profe cargada');
        break;
      case 'use-auto':
        if (S.active) { toast('Terminá o descartá el entrenamiento en curso primero'); break; }
        if (!confirm('¿Volver a la rutina automática? La rutina de tu profe queda guardada (con tus cambios) para volver a cargarla.')) break;
        S.customPlan = S.plan; S.plan = S.autoPlan || E.buildPlan(S.profile); if (S.plan.nextIdx == null) S.plan.nextIdx = 0; save(); render();
        break;
      case 'set-week': S.plan.week = +d.w; S.plan.nextIdx = 0; save(); render(); toast(+d.w > S.plan.nWeeks ? 'Progresión automática' : `Semana ${d.w}`); break;
      case 'add-ex': addExModal(+d.d); break;
      case 'do-add': {
        const day = S.plan.days[+d.d]; const ex = BY_ID[d.to];
        day.items.push({ exId: ex.id, role: ex.c ? 'main' : 'acc', perSide: false, rest: ex.c ? 120 : 75, rir: 2, weeks: [...Array(S.plan.nWeeks)].map(() => ({ sets: 3, reps: 10, kg: null })) });
        save(); closeModal(); render(); editItemModal(+d.d, day.items.length - 1);
        break;
      }
      case 'del-item':
        if (S.plan.days[+d.d].items.length <= 1) { toast('El día tiene que tener al menos un ejercicio'); break; }
        if (confirm('¿Quitar este ejercicio de la rutina?')) { S.plan.days[+d.d].items.splice(+d.i, 1); save(); closeModal(); render(); }
        break;
      case 'start': startWorkout(+d.day); break;
      case 'resume': openWorkout(); break;
      case 'pick-day':
        openModal(`<h3>Elegí qué día hacer</h3><ul class="alt-list">${S.plan.days.map((dd, i) => `<li><button data-action="start-day" data-day="${i}"><span><b>Día ${i + 1}: ${esc(dd.name)}</b><small>${esc(dd.focus)}</small></span></button></li>`).join('')}</ul>`);
        break;
      case 'start-day': closeModal(); S.plan.nextIdx = +d.day; save(); startWorkout(+d.day); break;
      case 'tech': techModal(d.ex); break;
      case 'video-del': delete S.videos[d.ex]; save(); techModal(d.ex); break;
      case 'swap': swapModal({ d: +d.d, i: +d.i }); break;
      case 'swap-w': swapModal({ w: +d.w }); break;
      case 'do-swap': doSwap(el); break;
      case 'edit-item': editItemModal(+d.d, +d.i); break;
      case 'w-min': closeWorkout(); render(); break;
      case 'w-finish': finishWorkout(); break;
      case 'w-cancel':
        if (confirm('¿Descartar este entrenamiento? No se guardará nada.')) { S.active = null; save(); stopTimer(); closeWorkout(); render(); }
        break;
      case 'set-done': setDone(+d.i, +d.s); break;
      case 'time-set': timeSet(+d.i, +d.s); break;
      case 'add-set': { const it = S.active.items[+d.i]; const lastRow = it.rows[it.rows.length - 1]; it.rows.push({ w: lastRow ? lastRow.w : null, reps: null, done: false }); save(); renderWorkout(); break; }
      case 'del-set': { const it = S.active.items[+d.i]; const idx = it.rows.map((r) => r.done).lastIndexOf(false); if (idx >= 0 && it.rows.length > 1) it.rows.splice(idx, 1); save(); renderWorkout(); break; }
      case 'rir': S.active.items[+d.i].rirLast = +d.v; save(); renderWorkout(); break;
      case 'plates': {
        const w = +d.w; const pl = E.plates(w);
        openModal(`<h3>Discos para ${kg(w)}</h3>${pl && pl.perSide.length ? `<p>Barra olímpica de 20 kg + <b>por lado</b>:</p><div class="plates">${pl.perSide.map((x) => `<span class="plate p${String(x).replace('.', '_')}">${fmtN(x)}</span>`).join('')}</div>${pl.rest ? `<p class="small muted">Sobran ${fmtN(pl.rest)} kg por lado: redondeá.</p>` : ''}` : `<p>${w <= 20 ? 'Usá la barra sola (20 kg) o una barra más liviana (10–15 kg) si tu gimnasio la tiene.' : ''}</p>`}<p class="small muted">Si tu barra pesa distinto (p. ej. 15 kg), restá ese peso y dividí por dos.</p>`);
        break;
      }
      case 'rest-add': if (timer) { timer.endAt += (+d.sec) * 1000; timer.total = Math.max(timer.total + (+d.sec), 1); if (S.active) { S.active.timer = { ...S.active.timer, endAt: timer.endAt, total: timer.total }; save(); } timerTick(); } break;
      case 'rest-skip': stopTimer(); break;
      case 'del-log':
        if (confirm('¿Eliminar este registro del historial?')) { S.logs = S.logs.filter((l) => l.id !== d.id); save(); render(); }
        break;
      case 'export': exportData(); break;
      case 'test-sound': audio(); finishSound(); vibrate([200, 100, 200]); break;
      case 'restart-cycle': S.plan.cycleStart = new Date().toISOString(); save(); toast('Bloque reiniciado: semana 1'); render(); break;
      case 'reset-all':
        if (confirm('Se borrarán perfil, rutina e historial de este dispositivo. ¿Continuar?')) {
          try { localStorage.removeItem(KEY); } catch (e) { /* */ }
          S = load(); tab = 'hoy'; stopTimer(); closeWorkout(); render();
        }
        break;
      default: break;
    }
  });

  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.field && S.active) {
      const r = S.active.items[+t.dataset.i].rows[+t.dataset.s];
      r[t.dataset.field] = t.value === '' ? null : num(t.value);
      save();
    }
    if (t.dataset.setting === 'volume') { S.settings.volume = +t.value; save(); }
    if (t.id === 'exSearch') {
      const q = t.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      document.querySelectorAll('#exList li').forEach((li) => { li.hidden = q && !li.dataset.q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q); });
    }
  });

  document.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.id === 'chartSel') { chartEx = t.value; drawCharts(); return; }
    if (t.id === 'importFile' && t.files[0]) { importData(t.files[0]); return; }
    const k = t.dataset.setting;
    if (!k || k === 'volume') return;
    if (k === 'autoDeload') { S.profile.autoDeload = t.checked; save(); return; }
    S.settings[k] = t.checked;
    if (k === 'notify' && t.checked) {
      if (!('Notification' in window)) { toast('Este navegador no soporta notificaciones'); S.settings.notify = false; t.checked = false; }
      else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast('Permiso de notificaciones denegado'); S.settings.notify = false; t.checked = false; }
      }
    }
    save();
  });

  document.addEventListener('submit', (ev) => {
    const f = ev.target; ev.preventDefault();
    if (f.id === 'profileForm') {
      const onboarding = !S.profile;
      const { p, errs } = readProfileForm(f);
      if (errs.length) { toast(errs.join(' · '), 4000); return; }
      if (!onboarding && !confirm('Se regenerará la rutina con los nuevos datos (las personalizaciones del plan se pierden; el historial se conserva). ¿Continuar?')) return;
      applyProfile(p, onboarding);
      tab = onboarding ? 'rutina' : 'perfil';
      render(); window.scrollTo(0, 0);
      if (onboarding) {
        openModal(`<h3>¡Tu rutina está lista!</h3>
          <p><b>${esc(S.plan.split)}</b>: ${S.plan.daysPerWeek} días por semana (${S.plan.weekdays.map((x) => E.DAY_NAMES[x]).join(', ')}).</p>
          <p class="small">${esc(S.plan.recDays.why)}</p>
          ${(p.parq || []).length ? '<p class="small warn-text">Marcaste alguna respuesta afirmativa en el chequeo de salud: consultá a tu médico antes de empezar.</p>' : ''}
          <p class="small">Tocá cualquier ejercicio para ver la técnica (imágenes y video). Las cargas de la primera sesión son estimaciones prudentes: ajustalas y la app aprende de lo que registres.</p>
          <button class="btn btn-primary btn-block" data-action="modal-close">Ver mi rutina</button>`);
      } else toast('Rutina actualizada');
      return;
    }
    if (f.id === 'editWeeksForm') {
      const it = S.plan.days[+f.dataset.d].items[+f.dataset.i];
      const fd = new FormData(f);
      for (let k = 0; k < it.weeks.length; k++) {
        const sets = parseInt(fd.get(`s${k}`), 10); const reps = parseInt(fd.get(`r${k}`), 10); const kv = num(fd.get(`k${k}`) || '');
        if (!(sets > 0 && reps > 0)) { toast(`Revisá series y reps de la semana ${k + 1}`); return; }
        it.weeks[k] = { sets, reps, kg: kv };
      }
      it.perSide = !!fd.get('perSide'); it.rest = +fd.get('rest');
      save(); closeModal(); render(); toast('Ejercicio actualizado');
      return;
    }
    if (f.id === 'editItemForm') {
      const it = S.plan.days[+f.dataset.d].items[+f.dataset.i];
      const fd = new FormData(f);
      const lo = +fd.get('lo'); const hi = +fd.get('hi');
      if (!(lo > 0 && hi >= lo)) { toast('El máximo debe ser mayor o igual al mínimo'); return; }
      Object.assign(it, { sets: Math.max(1, +fd.get('sets')), rir: Math.max(0, +fd.get('rir')), lo, hi, rest: +fd.get('rest') });
      save(); closeModal(); render(); toast('Ejercicio actualizado');
      return;
    }
    if (f.id === 'videoForm') {
      const id = ytId(new FormData(f).get('url'));
      if (!id) { toast('No reconozco ese link de YouTube'); return; }
      S.videos[f.dataset.ex] = id; save(); techModal(f.dataset.ex); toast('Video guardado');
      return;
    }
    if (f.id === 'bwForm') {
      const v = num(new FormData(f).get('kg'));
      if (!(v >= 30 && v <= 250)) { toast('Peso inválido'); return; }
      S.bw.push({ date: new Date().toISOString(), kg: v });
      S.profile.weight = v; save(); render(); toast('Peso registrado');
    }
  });

  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  // ------------------------------------------------------------------
  // Exportar / importar
  // ------------------------------------------------------------------
  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'rutina-gim', version: 1, exportedAt: new Date().toISOString(), data: S }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rutina-gim-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        const d = j.data || j;
        if (!d.profile || !d.plan || !Array.isArray(d.logs)) throw new Error('formato');
        if (!confirm(`Se reemplazarán los datos actuales por los del archivo (${d.logs.length} entrenamientos). ¿Continuar?`)) return;
        S = { ...load(), ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
        S.videos = S.videos || {}; S.bw = S.bw || [];
        save(); render(); toast('Datos importados');
      } catch (e) { toast('El archivo no es una copia válida de Rutina Gim'); }
    };
    r.readAsText(file);
  }

  // ------------------------------------------------------------------
  // Contraseña (bloqueo local)
  // ------------------------------------------------------------------
  const LOCK_AFTER_MIN = 5;
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

  async function hashPw(pw, saltB64) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 150000, hash: 'SHA-256' }, key, 256);
    return b64(bits);
  }
  async function checkPw(pw) {
    if (!S.lock) return true;
    return (await hashPw(pw, S.lock.salt)) === S.lock.hash;
  }
  async function setPw(pw) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    S.lock = { salt, hash: await hashPw(pw, salt) };
    save();
  }

  let locked = false;
  let fails = 0; let blockedUntil = 0;
  function showLock() {
    if (!S.lock) return;
    locked = true;
    let el = $('#lock');
    if (!el) { el = document.createElement('div'); el.id = 'lock'; el.className = 'lock'; document.body.appendChild(el); }
    el.innerHTML = `
      <form id="unlockForm" class="lock-card">
        <div class="logo">${logoSvg()}</div>
        <h2>Rutina Gim</h2>
        <p class="muted small">Ingresá tu contraseña</p>
        <input name="pw" type="password" autocomplete="current-password" aria-label="Contraseña" required/>
        <p class="lock-err" id="lockErr"></p>
        <button class="btn btn-primary btn-block" type="submit">Entrar</button>
        <button class="link small" type="button" data-action="pw-forgot">Olvidé la contraseña</button>
      </form>`;
    el.hidden = false;
    setTimeout(() => { const i = $('#unlockForm input'); i && i.focus(); }, 50);
  }
  function hideLock() { locked = false; const el = $('#lock'); if (el) { el.hidden = true; el.innerHTML = ''; } }

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (S.lock && !locked && !S.active && hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MIN * 60000) showLock();
  });

  document.addEventListener('submit', async (ev) => {
    const f = ev.target;
    if (f.id === 'unlockForm') {
      ev.preventDefault();
      const err = $('#lockErr');
      if (Date.now() < blockedUntil) { err.textContent = `Demasiados intentos. Esperá ${Math.ceil((blockedUntil - Date.now()) / 1000)} s.`; return; }
      const pw = new FormData(f).get('pw');
      if (await checkPw(pw)) { fails = 0; hideLock(); return; }
      fails++;
      if (fails >= 5) { blockedUntil = Date.now() + 30000 * (fails - 4); }
      err.textContent = fails >= 5 ? 'Contraseña incorrecta. Esperá 30 s para reintentar.' : 'Contraseña incorrecta.';
      f.reset(); vibrate(200);
    }
    if (f.id === 'pwForm') {
      ev.preventDefault();
      const fd = new FormData(f);
      if (S.lock && !(await checkPw(fd.get('cur')))) { toast('La contraseña actual no es correcta'); return; }
      const pw = fd.get('pw') || '';
      if (pw.length < 4) { toast('La contraseña debe tener al menos 4 caracteres'); return; }
      if (pw !== fd.get('pw2')) { toast('Las contraseñas no coinciden'); return; }
      await setPw(pw); render(); toast('Contraseña guardada 🔒');
    }
  }, true);

  document.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-action="pw-remove"], [data-action="pw-forgot"]');
    if (!el) return;
    ev.stopPropagation();
    if (el.dataset.action === 'pw-remove') {
      const cur = $('#pwForm [name=cur]').value;
      if (!(await checkPw(cur))) { toast('Escribí tu contraseña actual para quitarla'); return; }
      S.lock = null; save(); render(); toast('Contraseña desactivada');
    } else if (confirm('Sin la contraseña no se pueden recuperar los datos. ¿Borrar TODO (perfil, rutina e historial) y empezar de nuevo?')) {
      try { localStorage.removeItem(KEY); } catch (e) { /* */ }
      location.reload();
    }
  }, true);

  // ------------------------------------------------------------------
  // Inicio
  // ------------------------------------------------------------------
  render();
  if (S.active) {
    // retomar automáticamente un entrenamiento en curso
    openWorkout();
  }
  if (S.lock) showLock();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {}));
    // Cuando se instala una versión nueva de la app, recargar una vez para usarla.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || S.active) return;
      reloaded = true; location.reload();
    });
  }
})();
