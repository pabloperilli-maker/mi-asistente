/*
 * Motor de la rutina: cálculos de perfil, armado del plan, carga sugerida,
 * progresión y descargas. Sin dependencias de DOM (se puede testear con Node).
 */
(function (root) {
  const Ex = (typeof module !== 'undefined' && module.exports)
    ? require('./exercises.js')
    : root.GymExercises;
  const { BY_ID, EXERCISES } = Ex;

  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DAY_NAMES_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const GOALS = {
    fuerza: 'Ganar fuerza',
    hipertrofia: 'Ganar masa muscular',
    grasa: 'Bajar grasa / recomposición',
    salud: 'Salud general y bienestar'
  };
  const LEVELS = { 1: 'Principiante (menos de 6 meses)', 2: 'Intermedio (6 meses a 2 años)', 3: 'Avanzado (más de 2 años)' };
  const EQUIP = { gym: 'Gimnasio completo', db: 'Casa con mancuernas', bw: 'Casa sin equipamiento' };

  // ------------------------------------------------------------------
  // Métricas del perfil
  // ------------------------------------------------------------------
  function metrics(p) {
    const h = p.height / 100;
    const bmi = p.weight / (h * h);
    let bmiCat = 'Normal';
    if (bmi < 18.5) bmiCat = 'Bajo peso';
    else if (bmi >= 30) bmiCat = 'Obesidad';
    else if (bmi >= 25) bmiCat = 'Sobrepeso';
    // Mifflin-St Jeor
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
    const days = p.plannedDays || 3;
    const factor = days <= 2 ? 1.375 : days <= 4 ? 1.465 : 1.55;
    const tdee = bmr * factor;
    let kcal = tdee;
    let kcalNote = 'Mantenimiento';
    if (p.goal === 'grasa') { kcal = tdee * 0.8; kcalNote = 'Déficit moderado (~20 %)'; }
    else if (p.goal === 'hipertrofia') { kcal = tdee * 1.08; kcalNote = 'Superávit leve (~8 %)'; }
    else if (p.goal === 'fuerza') { kcal = tdee * 1.05; kcalNote = 'Leve superávit (~5 %)'; }
    // Proteína: referencia sobre peso objetivo si hay obesidad
    const refW = bmi >= 30 ? 25 * h * h : p.weight;
    const protLo = Math.round(refW * (p.goal === 'salud' ? 1.2 : 1.6));
    const protHi = Math.round(refW * (p.goal === 'salud' ? 1.6 : 2.2));
    const water = Math.round(p.weight * 35 / 100) / 10; // litros
    const maxHR = Math.round(208 - 0.7 * p.age); // Tanaka
    return {
      bmi: Math.round(bmi * 10) / 10, bmiCat,
      bmr: Math.round(bmr), tdee: Math.round(tdee),
      kcal: Math.round(kcal / 10) * 10, kcalNote,
      protLo, protHi, water,
      maxHR, z2Lo: Math.round(maxHR * 0.6), z2Hi: Math.round(maxHR * 0.7)
    };
  }

  // Días recomendados según objetivo y nivel, limitados por disponibilidad.
  function recommendedDays(p) {
    const avail = (p.weekdays || []).length || 3;
    let rec;
    if (p.goal === 'salud') rec = p.level === 1 ? 2 : 3;
    else if (p.goal === 'grasa') rec = p.level === 1 ? 3 : 4;
    else if (p.goal === 'fuerza') rec = p.level === 1 ? 3 : 4;
    else rec = p.level === 1 ? 3 : p.level === 2 ? 4 : 5;
    if (p.age >= 65) rec = Math.min(rec, 3);
    const days = Math.max(2, Math.min(rec, avail, 6));
    let why;
    if (p.level === 1) why = 'Al empezar, 3 sesiones de cuerpo completo dan la frecuencia ideal (cada músculo 2–3 veces por semana) con tiempo para recuperarse.';
    else if (rec >= 5) why = 'Con experiencia, dividir en 5 días permite más volumen semanal por músculo sin sesiones eternas.';
    else if (rec === 4) why = '4 días (torso/pierna) permiten entrenar cada músculo 2 veces por semana con buen volumen y recuperación.';
    else why = 'Con 2–3 sesiones bien hechas por semana ya obtenés la mayor parte de los beneficios para la salud.';
    if (avail < rec) why += ` Marcaste ${avail} día(s) disponible(s): ajustamos la rutina a eso.`;
    return { rec, days, why };
  }

  // Elige los días de la semana más espaciados posibles.
  function spreadDays(avail, n) {
    const a = [...new Set(avail)].sort((x, y) => x - y);
    if (a.length <= n) return a;
    let best = null; let bestScore = -1;
    const combo = (start, chosen) => {
      if (chosen.length === n) {
        // mínima distancia circular entre días consecutivos
        let minGap = 7; let consecutive = 0;
        for (let i = 0; i < chosen.length; i++) {
          const cur = chosen[i]; const next = chosen[(i + 1) % chosen.length];
          const gap = ((next - cur + 7) % 7) || 7;
          minGap = Math.min(minGap, gap);
          if (gap === 1) consecutive++;
        }
        const score = minGap * 10 - consecutive - (chosen.includes(0) ? 0.5 : 0);
        if (score > bestScore) { bestScore = score; best = chosen.slice(); }
        return;
      }
      for (let i = start; i < a.length; i++) combo(i + 1, chosen.concat(a[i]));
    };
    combo(0, []);
    return best;
  }

  // ------------------------------------------------------------------
  // Parámetros por objetivo
  // ------------------------------------------------------------------
  function goalParams(p) {
    const G = {
      fuerza: { main: { sets: 4, lo: 4, hi: 6, rest: 180, rir: 2 }, acc: { sets: 3, lo: 8, hi: 12, rest: 90, rir: 2 }, cardio: 10 },
      hipertrofia: { main: { sets: 3, lo: 6, hi: 10, rest: 150, rir: 2 }, acc: { sets: 3, lo: 10, hi: 15, rest: 75, rir: 1 }, cardio: 0 },
      grasa: { main: { sets: 3, lo: 8, hi: 12, rest: 120, rir: 2 }, acc: { sets: 3, lo: 12, hi: 15, rest: 60, rir: 2 }, cardio: 20 },
      salud: { main: { sets: 3, lo: 8, hi: 12, rest: 90, rir: 3 }, acc: { sets: 2, lo: 12, hi: 15, rest: 60, rir: 3 }, cardio: 15 }
    }[p.goal] || null;
    const g = JSON.parse(JSON.stringify(G || {
      main: { sets: 3, lo: 6, hi: 10, rest: 150, rir: 2 }, acc: { sets: 3, lo: 10, hi: 15, rest: 75, rir: 1 }, cardio: 0
    }));
    if (p.level === 1) {
      g.main.sets = Math.min(g.main.sets, 3);
      g.main.rir = Math.max(g.main.rir, 2) + 1;
      g.acc.rir = Math.max(g.acc.rir, 2);
      if (g.main.lo < 5) { g.main.lo = 5; g.main.hi = 8; }
    } else if (p.level === 3) {
      g.main.sets = Math.min(g.main.sets + 1, 5);
    }
    if (p.age >= 50) {
      if (g.main.lo < 6) { g.main.lo = 6; g.main.hi = Math.max(g.main.hi, 10); }
      g.main.rest += 30; g.acc.rest += 15;
    }
    if (p.age >= 60) {
      g.main.rir = Math.min(g.main.rir + 1, 4);
      g.acc.rir = Math.min(g.acc.rir + 1, 4);
    }
    return g;
  }

  // ------------------------------------------------------------------
  // Plantillas de días
  // ------------------------------------------------------------------
  const T = (name, focus, slots) => ({ name, focus, slots });
  const M = (p) => [p, 'main'];
  const A = (p) => [p, 'acc'];

  function templates(days) {
    const fullA = T('Cuerpo completo A', 'Sentadilla · empuje · remo', [M('squat'), M('hPush'), M('hPull'), A('kneeFlex'), A('lateral'), A('core'), A('calves')]);
    const fullB = T('Cuerpo completo B', 'Bisagra · tracción · hombros', [M('hinge'), M('vPull'), M('vPush'), A('lunge'), A('biceps'), A('triceps'), A('core')]);
    const fullC = T('Cuerpo completo C', 'Pierna · inclinado · remo', [M('squat'), M('incPush'), M('hPull'), A('hinge'), A('rear'), A('core'), A('calves')]);
    const upA = T('Torso A', 'Pecho · espalda · hombros', [M('hPush'), M('hPull'), M('vPush'), M('vPull'), A('lateral'), A('triceps'), A('biceps')]);
    const loA = T('Pierna A', 'Énfasis cuádriceps', [M('squat'), M('hinge'), A('lunge'), A('kneeExt'), A('kneeFlex'), A('calves'), A('core')]);
    const upB = T('Torso B', 'Espalda · pecho alto', [M('vPull'), M('incPush'), M('hPull'), A('fly'), A('rear'), A('biceps'), A('triceps')]);
    const loB = T('Pierna B', 'Énfasis glúteo e isquios', [M('hinge'), M('squat'), A('lunge'), A('kneeFlex'), A('calves'), A('core')]);
    const push = T('Empuje', 'Pecho · hombros · tríceps', [M('hPush'), M('incPush'), A('vPush'), A('lateral'), A('fly'), A('triceps')]);
    const pull = T('Tracción', 'Espalda · bíceps · hombro posterior', [M('vPull'), M('hPull'), A('hPull'), A('rear'), A('biceps'), A('biceps')]);
    const legs = T('Pierna', 'Cuádriceps · glúteo · isquios', [M('squat'), M('hinge'), A('lunge'), A('kneeExt'), A('kneeFlex'), A('calves'), A('core')]);
    switch (days) {
      case 2: return { split: 'Cuerpo completo (2 días)', days: [fullA, fullB] };
      case 3: return { split: 'Cuerpo completo (3 días)', days: [fullA, fullB, fullC] };
      case 4: return { split: 'Torso / Pierna (4 días)', days: [upA, loA, upB, loB] };
      case 5: return { split: 'Torso / Pierna + Empuje / Tracción / Pierna (5 días)', days: [upA, loA, push, pull, legs] };
      default: {
        const p2 = { ...push, name: 'Empuje B', slots: [M('incPush'), M('vPush'), A('hPush'), A('lateral'), A('fly'), A('triceps')] };
        const l2 = { ...pull, name: 'Tracción B', slots: [M('hPull'), M('vPull'), A('hPull'), A('rear'), A('biceps'), A('core')] };
        const g2 = { ...legs, name: 'Pierna B', slots: [M('hinge'), M('squat'), A('lunge'), A('kneeFlex'), A('calves'), A('core')] };
        return { split: 'Empuje / Tracción / Pierna x2 (6 días)', days: [{ ...push, name: 'Empuje A' }, { ...pull, name: 'Tracción A' }, { ...legs, name: 'Pierna A' }, p2, l2, g2] };
      }
    }
  }

  // ------------------------------------------------------------------
  // Selección de ejercicios
  // ------------------------------------------------------------------
  function eligible(pattern, p) {
    const limits = p.limits || [];
    return EXERCISES.filter((e) =>
      e.p === pattern &&
      e.eq.includes(p.equipment) &&
      e.lvl <= p.level &&
      !e.avoid.some((z) => limits.includes(z))
    );
  }

  // Para "rol" principal preferimos multiarticulares con carga externa.
  function rank(e, role, p) {
    let s = 0;
    if (role === 'main' && e.c) s += 3;
    if (role === 'main' && e.r != null) s += 2;
    if (p.equipment === 'gym' && e.tool === 'corporal') s -= 1;
    if (p.level === 1 && e.tool === 'barra' && e.lvl === 1 && (p.age >= 60)) s -= 2; // mayores: preferir máquinas al inicio
    if (p.age >= 60 && e.tool === 'maquina') s += 1;
    return s;
  }

  function pickExercise(pattern, role, p, used) {
    // Las variantes "extra" (de rutinas de profesores) no se eligen solas.
    const list = eligible(pattern, p).filter((e) => !e.extra);
    if (!list.length) return null;
    const sorted = list
      .map((e, i) => ({ e, i, s: rank(e, role, p) }))
      .sort((a, b) => (b.s - a.s) || (a.i - b.i));
    // En principales preferimos ejercicios con carga externa aunque se repitan
    // en la semana; en accesorios, variedad.
    const loaded = (x) => role !== 'main' || p.equipment !== 'gym' || x.e.r != null;
    const pick = sorted.find((x) => !used.has(x.e.id) && loaded(x)) ||
      sorted.find((x) => loaded(x)) ||
      sorted.find((x) => !used.has(x.e.id)) || sorted[0];
    return pick.e;
  }

  function alternatives(pattern, p, currentId) {
    return eligible(pattern, p).filter((e) => e.id !== currentId);
  }

  // Ítem de plan para un ejercicio con parámetros del rol.
  function makeItem(ex, role, g, p) {
    const prm = role === 'main' ? g.main : g.acc;
    const item = { exId: ex.id, role, sets: prm.sets, lo: prm.lo, hi: prm.hi, rest: prm.rest, rir: prm.rir };
    if (ex.p === 'core' || ex.p === 'calves') { item.rest = Math.min(item.rest, 60); item.lo = Math.max(item.lo, 10); item.hi = Math.max(item.hi, 15); }
    if (ex.time) { item.lo = p.level === 1 ? 20 : 30; item.hi = p.level === 1 ? 40 : 60; item.sets = Math.min(item.sets, 3); }
    if (ex.r == null && !ex.time) {
      // peso corporal: rango más amplio
      item.lo = Math.max(item.lo, 6); item.hi = Math.max(item.hi, item.lo + 6);
    }
    return item;
  }

  function itemMinutes(it) {
    const ex = BY_ID[it.exId];
    if (ex && ex.p === 'cardio') return it.lo;
    const work = ex && ex.time ? (it.hi / 60) : 0.75;
    return it.sets * (work + it.rest / 60) + 1.5;
  }

  function dayMinutes(day) {
    return Math.round(8 + day.items.reduce((s, it) => s + itemMinutes(it), 0));
  }

  function buildPlan(p) {
    const rd = recommendedDays(p);
    const n = rd.days;
    const weekdays = spreadDays(p.weekdays && p.weekdays.length ? p.weekdays : [1, 3, 5], n);
    const tpl = templates(n);
    const g = goalParams(p);
    const used = new Set();
    const days = tpl.days.map((d) => {
      const items = [];
      d.slots.forEach(([pattern, role]) => {
        const ex = pickExercise(pattern, role, p, used);
        if (!ex) return;
        if (items.some((it) => it.exId === ex.id)) {
          // mismo patrón dos veces en el día (p. ej. 2 de bíceps): buscar otro
          const alt = alternatives(pattern, p, ex.id).find((e) => !items.some((it) => it.exId === e.id));
          if (!alt) return;
          used.add(alt.id); items.push(makeItem(alt, role, g, p)); return;
        }
        used.add(ex.id);
        items.push(makeItem(ex, role, g, p));
      });
      if (g.cardio) {
        const c = pickExercise('cardio', 'acc', p, used);
        if (c) items.push({ exId: c.id, role: 'cardio', sets: 1, lo: g.cardio, hi: g.cardio, rest: 0, rir: 0, cardio: true });
      }
      const day = { name: d.name, focus: d.focus, items };
      // Ajuste al tiempo disponible: quitar accesorios desde el final.
      const limit = p.sessionMin || 60;
      while (dayMinutes(day) > limit && day.items.filter((i) => i.role === 'acc').length > 1) {
        let idx = -1;
        for (let i = day.items.length - 1; i >= 0; i--) if (day.items[i].role === 'acc') { idx = i; break; }
        day.items.splice(idx, 1);
      }
      // Si sigue largo, reducir series de accesorios y luego cardio
      if (dayMinutes(day) > limit) day.items.forEach((i) => { if (i.role === 'acc' && i.sets > 2) i.sets = 2; });
      if (dayMinutes(day) > limit) day.items.forEach((i) => { if (i.cardio) { i.lo = i.hi = Math.max(10, i.lo - 10); } });
      for (let k = day.items.length - 1; k >= 0 && dayMinutes(day) > limit; k--) {
        const it = day.items[k];
        if (it.role === 'main' && it.sets > 3) it.sets = 3;
      }
      return day;
    });
    return {
      createdAt: new Date().toISOString(),
      split: tpl.split,
      weekdays,
      daysPerWeek: n,
      recDays: rd,
      days
    };
  }

  // ------------------------------------------------------------------
  // Cargas
  // ------------------------------------------------------------------
  const e1rm = (w, reps) => w * (1 + reps / 30); // Epley
  const weightFor = (oneRM, reps) => oneRM / (1 + reps / 30);

  const DB_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50];

  function roundWeight(w, ex) {
    if (ex.tool === 'barra') {
      const r = Math.floor(w / 2.5) * 2.5;
      return Math.max(r, 10);
    }
    if (ex.tool === 'mancuernas') {
      let best = DB_STEPS[0];
      for (const s of DB_STEPS) if (s <= w + 0.01) best = s;
      return best;
    }
    const step = w > 40 ? 5 : 2.5;
    return Math.max(step, Math.floor(w / step) * step);
  }

  function nextUp(w, ex) {
    if (ex.tool === 'mancuernas') {
      const nx = DB_STEPS.find((s) => s > w + 0.01);
      return nx || w + 2;
    }
    if (ex.tool === 'barra') return w + (ex.lower && w >= 60 ? 5 : 2.5);
    if (ex.tool === 'maquina') return w + (ex.lower ? 5 : 2.5);
    return w + 2.5;
  }

  function initialWeight(ex, item, p) {
    if (ex.r == null) return null;
    const h = p.height / 100;
    const ideal = 25 * h * h;
    const effBW = p.weight > ideal ? ideal + 0.5 * (p.weight - ideal) : p.weight;
    const lvl = { 1: 0.6, 2: 1, 3: 1.3 }[p.level] || 0.8;
    const sex = p.sex === 'f' ? (ex.lower ? 0.75 : 0.55) : 1;
    const age = p.age < 40 ? 1 : p.age < 50 ? 0.95 : p.age < 60 ? 0.88 : p.age < 70 ? 0.8 : 0.7;
    const w10 = effBW * ex.r * lvl * sex * age;
    const reps = Math.round((item.lo + item.hi) / 2) + item.rir;
    const w = weightFor(e1rm(w10, 10), reps) * 0.9; // primera sesión conservadora
    return roundWeight(w, ex);
  }

  // Sesiones previas (más recientes primero) donde aparece el ejercicio.
  function historyFor(exId, logs) {
    const out = [];
    for (let i = logs.length - 1; i >= 0; i--) {
      const e = logs[i].entries.find((x) => x.exId === exId && x.sets && x.sets.length);
      if (e) out.push({ date: logs[i].date, deload: logs[i].deload, ...e });
    }
    return out;
  }

  const HARDER = {
    flexiones_inclinadas: 'flexiones', flexiones: 'flexiones_declinadas',
    dominadas_asistidas: 'dominadas', sentadilla_corporal: 'goblet',
    zancadas_corporal: 'bulgara', puente: 'hip_thrust'
  };

  /*
   * Recomendación para la próxima sesión (doble progresión):
   *  - Todas las series en el tope del rango → subir peso.
   *  - Todas dentro del rango → mismo peso, sumar repeticiones.
   *  - Debajo del rango dos veces seguidas → bajar ~10 %.
   *  - Tres sesiones sin progreso → sugerir descarga del ejercicio.
   */
  function recommend(item, logs, p, deload) {
    const ex = BY_ID[item.exId];
    const hist = historyFor(item.exId, logs).filter((h) => !h.deload);
    const base = { reps: `${item.lo}–${item.hi}`, unit: ex.time ? 's' : 'reps' };
    if (item.cardio) return { ...base, kind: 'cardio', w: null, msg: `${item.lo} min a intensidad moderada (podés hablar en frases cortas).` };

    if (ex.r == null) {
      // Peso corporal o tiempo
      if (!hist.length) return { ...base, kind: 'start', w: null, msg: ex.time ? `Mantené ${item.lo} s con técnica perfecta.` : `Hacé las reps que puedas con buena técnica dejando ${item.rir} en reserva.` };
      const last = hist[0];
      const allTop = last.sets.every((s) => s.reps >= item.hi);
      const best = Math.max(...last.sets.map((s) => s.reps));
      if (allTop) {
        const h = HARDER[ex.id] && BY_ID[HARDER[ex.id]];
        const unlocked = h && h.eq.includes(p.equipment) && h.lvl <= p.level + 1;
        return { ...base, kind: 'up', w: null, msg: ex.time ? `¡Bien! Probá ${item.hi + 10} s por serie o sumá un lastre.` : unlocked ? `¡Dominado! Pasá a "${h.n}" o sumá peso/pausas.` : `¡Dominado! Sumá peso (mochila), tempo lento (3 s al bajar) o pausa abajo.` };
      }
      return { ...base, kind: 'keep', w: null, msg: `Última vez: mejor serie ${best} ${ex.time ? 's' : 'reps'}. Intentá sumar ${ex.time ? '5 s' : '1 rep'} por serie.` };
    }

    let rec;
    if (!hist.length) {
      const w = initialWeight(ex, item, p);
      rec = { ...base, kind: 'start', w, msg: `Peso inicial estimado. Si en la 1.ª serie te sobran más de ${item.rir + 2} reps, subí; si no llegás a ${item.lo}, bajá.` };
    } else {
      const last = hist[0];
      const w = Math.max(...last.sets.map((s) => s.w || 0));
      const sets = last.sets.filter((s) => (s.w || 0) >= w - 0.01);
      const allTop = sets.length >= Math.min(item.sets, last.sets.length) && sets.every((s) => s.reps >= item.hi);
      const allIn = sets.every((s) => s.reps >= item.lo);
      const below = sets.filter((s) => s.reps < item.lo).length;
      const easy = last.rir != null && last.rir >= item.rir + 2;
      if (allTop || (allIn && easy)) {
        const nw = nextUp(w, ex);
        rec = { ...base, kind: 'up', w: nw, msg: `¡Progresión! Completaste ${sets.map((s) => s.reps).join('/')} con ${fmtKg(w)}. Subí a ${fmtKg(nw)} y empezá desde ${item.lo} reps.` };
      } else if (allIn) {
        // detectar estancamiento: 3 sesiones con mismo peso y sin más reps
        const stalled = stallCount(hist, w) >= 3;
        if (stalled) {
          const dw = roundWeight(w * 0.9, ex);
          rec = { ...base, kind: 'down', w: dw, msg: `Llevás 3 sesiones sin progresar con ${fmtKg(w)}. Bajá a ${fmtKg(dw)} y volvé a construir (mini-descarga).` };
        } else {
          rec = { ...base, kind: 'keep', w, msg: `Mismo peso (${fmtKg(w)}). Última vez: ${sets.map((s) => s.reps).join('/')} reps. Buscá +1 rep en alguna serie.` };
        }
      } else if (below >= 2) {
        const prevBad = hist[1] && hist[1].sets.filter((s) => s.reps < item.lo).length >= 2;
        if (prevBad) {
          const dw = roundWeight(w * 0.9, ex);
          rec = { ...base, kind: 'down', w: dw, msg: `Dos sesiones por debajo de ${item.lo} reps. Bajá a ${fmtKg(dw)} para entrenar en el rango correcto.` };
        } else {
          rec = { ...base, kind: 'keep', w, msg: `Te quedaste corto la última vez (${sets.map((s) => s.reps).join('/')}). Repetí ${fmtKg(w)}; si vuelve a pasar, bajamos.` };
        }
      } else {
        rec = { ...base, kind: 'keep', w, msg: `Mismo peso (${fmtKg(w)}). Última vez: ${sets.map((s) => s.reps).join('/')} reps.` };
      }
    }
    if (deload && rec.w) {
      const dw = roundWeight(rec.w * 0.85, ex);
      rec = { ...rec, kind: 'deload', w: dw, msg: `Semana de descarga: ${fmtKg(dw)}, menos series y lejos del fallo. Recuperarse también es progresar.` };
    }
    if (ex.tool === 'mancuernas' && rec.w) rec.perHand = true;
    return rec;
  }

  function stallCount(hist, w) {
    let n = 0; let prevTotal = null;
    for (const h of hist) {
      const hw = Math.max(...h.sets.map((s) => s.w || 0));
      if (Math.abs(hw - w) > 0.01) break;
      const total = h.sets.reduce((s, x) => s + x.reps, 0);
      if (prevTotal != null && total < prevTotal) break; // hubo progreso (más reps en la sesión más reciente)
      prevTotal = total; n++;
    }
    return n;
  }

  function fmtKg(w) {
    if (w == null) return '';
    return `${String(+w.toFixed(2)).replace('.', ',')} kg`;
  }

  // Series de aproximación para los principales.
  function warmupSets(w, ex) {
    if (!w || ex.r == null) return [];
    if (ex.tool === 'barra') {
      const out = [{ w: 20, reps: 10 }];
      [[0.4, 8], [0.6, 5], [0.8, 3]].forEach(([f, r]) => {
        const ww = roundWeight(w * f, ex);
        if (ww > 20 && ww < w && !out.some((o) => o.w === ww)) out.push({ w: ww, reps: r });
      });
      return out;
    }
    const out = [];
    [[0.5, 10], [0.75, 5]].forEach(([f, r]) => {
      const ww = roundWeight(w * f, ex);
      if (ww < w && !out.some((o) => o.w === ww)) out.push({ w: ww, reps: r });
    });
    return out;
  }

  // Discos por lado para una barra olímpica.
  function plates(total, bar = 20) {
    let side = (total - bar) / 2;
    if (side < 0) return null;
    const avail = [25, 20, 15, 10, 5, 2.5, 1.25];
    const out = [];
    for (const pl of avail) {
      while (side >= pl - 1e-9) { out.push(pl); side -= pl; }
    }
    return { perSide: out, rest: Math.round(side * 100) / 100 };
  }

  // ------------------------------------------------------------------
  // Mesociclo / descargas
  // ------------------------------------------------------------------
  function deloadEvery(p) { return { 1: 8, 2: 6, 3: 5 }[p.level] || 6; }

  function cycleInfo(plan, p, now = new Date()) {
    const start = new Date(plan.cycleStart || plan.createdAt);
    const weeks = Math.floor((now - start) / (7 * 864e5));
    const every = deloadEvery(p);
    const week = (weeks % every) + 1;
    const isDeload = p.autoDeload !== false && week === every;
    return { week, every, isDeload };
  }

  function deloadItem(it) {
    if (it.cardio) return it;
    return { ...it, sets: Math.max(1, Math.round(it.sets * 0.6)), rir: Math.min(it.rir + 2, 5) };
  }

  const api = {
    DAY_NAMES, DAY_NAMES_LONG, GOALS, LEVELS, EQUIP,
    metrics, recommendedDays, spreadDays, goalParams, buildPlan, templates,
    eligible, alternatives, makeItem, dayMinutes,
    e1rm, roundWeight, nextUp, initialWeight, recommend, historyFor,
    warmupSets, plates, fmtKg, cycleInfo, deloadItem, deloadEvery
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GymEngine = api;
})(typeof self !== 'undefined' ? self : this);
