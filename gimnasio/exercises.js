/*
 * Catálogo de ejercicios.
 *
 * Campos:
 *  id     identificador interno
 *  n      nombre en español
 *  p      patrón de movimiento (para armar la rutina y para los reemplazos)
 *  eq     equipamiento donde está disponible: 'gym' (gimnasio completo),
 *         'db' (mancuernas en casa), 'bw' (solo peso corporal)
 *  tool   'barra' | 'mancuernas' | 'maquina' | 'polea' | 'corporal'
 *  img    id de la carpeta de imágenes en free-exercise-db (dominio público)
 *  c      true si es multiarticular (compuesto)
 *  lvl    nivel mínimo recomendado: 1 principiante, 2 intermedio, 3 avanzado
 *  r      carga de 10RM estimada como fracción del peso corporal, para un
 *         hombre de nivel intermedio. En mancuernas es POR MANCUERNA.
 *         null = peso corporal.
 *  lower  true si es tren inferior (afecta el ajuste por sexo y el incremento)
 *  time   true si se mide en segundos (planchas)
 *  avoid  zonas a cuidar: 'rodilla' | 'lumbar' | 'hombro'
 *  m      músculos principales
 *  tips   claves de técnica
 *  errs   errores frecuentes
 *  yt     búsqueda sugerida para el video en YouTube
 */
(function (root) {
  const EXERCISES = [
    // ---------------- Sentadilla / dominante de rodilla ----------------
    {
      id: 'sentadilla', n: 'Sentadilla con barra', p: 'squat', eq: ['gym'], tool: 'barra',
      img: 'Barbell_Squat', c: true, lvl: 1, r: 0.95, lower: true, avoid: ['rodilla', 'lumbar'],
      m: 'Cuádriceps, glúteos, aductores, core',
      tips: [
        'Barra apoyada sobre los trapecios (no sobre la cervical), manos algo más anchas que los hombros.',
        'Pies al ancho de hombros, puntas levemente hacia afuera (15–30°).',
        'Tomá aire, apretá el abdomen (bracing) y bajá llevando la cadera atrás y abajo a la vez.',
        'Rodillas siguen la línea de las puntas de los pies; bajá hasta que el muslo quede paralelo o un poco más, sin perder la curva lumbar.',
        'Subí empujando el piso con todo el pie, pecho y cadera suben juntos.'
      ],
      errs: ['Rodillas que se cierran hacia adentro (valgo).', 'Talones que se levantan.', 'Redondear la espalda baja al final del recorrido ("butt wink" marcado).'],
      yt: 'sentadilla con barra técnica correcta'
    },
    {
      id: 'prensa', n: 'Prensa de piernas', p: 'squat', eq: ['gym'], tool: 'maquina',
      img: 'Leg_Press', c: true, lvl: 1, r: 1.9, lower: true, avoid: [],
      m: 'Cuádriceps, glúteos',
      tips: [
        'Espalda y glúteos bien apoyados en el respaldo durante todo el recorrido.',
        'Pies al ancho de hombros en el centro de la plataforma.',
        'Bajá controlado hasta ~90° de rodilla o hasta donde la pelvis no se despegue.',
        'Empujá con todo el pie sin trabar las rodillas arriba.'
      ],
      errs: ['Despegar la cadera del asiento al bajar demasiado.', 'Bloquear las rodillas en extensión.', 'Rodillas hacia adentro.'],
      yt: 'prensa de piernas 45 técnica correcta'
    },
    {
      id: 'hack', n: 'Sentadilla hack (máquina)', p: 'squat', eq: ['gym'], tool: 'maquina',
      img: 'Hack_Squat', c: true, lvl: 1, r: 1.1, lower: true, avoid: ['rodilla'],
      m: 'Cuádriceps, glúteos',
      tips: [
        'Espalda pegada al respaldo, hombros bajo las almohadillas.',
        'Pies al ancho de hombros, algo adelantados en la plataforma.',
        'Bajá controlado hasta muslos paralelos o un poco más.',
        'Subí sin trabar las rodillas.'
      ],
      errs: ['Talones que se despegan.', 'Rebotar abajo.', 'Rango de movimiento corto.'],
      yt: 'sentadilla hack maquina técnica'
    },
    {
      id: 'sentadilla_smith', n: 'Sentadilla en máquina Smith', p: 'squat', eq: ['gym'], tool: 'maquina',
      img: 'Smith_Machine_Squat', c: true, lvl: 1, r: 0.8, lower: true, avoid: ['rodilla'],
      m: 'Cuádriceps, glúteos',
      tips: [
        'Pies apenas adelantados respecto de la barra para mantener el torso erguido.',
        'Bracing antes de cada repetición.',
        'Bajá hasta muslos paralelos manteniendo la espalda neutra.',
        'Subí empujando con todo el pie.'
      ],
      errs: ['Pies justo debajo de la barra (carga excesiva en rodillas).', 'Rebotar abajo.'],
      yt: 'sentadilla smith técnica correcta'
    },
    {
      id: 'goblet', n: 'Sentadilla goblet', p: 'squat', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Goblet_Squat', c: true, lvl: 1, r: 0.3, lower: true, avoid: ['rodilla'],
      m: 'Cuádriceps, glúteos, core',
      tips: [
        'Sostené UNA mancuerna vertical pegada al pecho, codos hacia abajo.',
        'Pies al ancho de hombros o algo más, puntas afuera.',
        'Bajá entre las piernas manteniendo el torso erguido; los codos pueden rozar el interior de las rodillas.',
        'Subí empujando el piso, sin despegar talones.'
      ],
      errs: ['Separar la mancuerna del cuerpo.', 'Inclinar el torso hacia adelante.', 'Rodillas hacia adentro.'],
      yt: 'sentadilla goblet técnica correcta'
    },
    {
      id: 'sentadilla_corporal', n: 'Sentadilla con peso corporal', p: 'squat', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Bodyweight_Squat', c: true, lvl: 1, r: null, lower: true, avoid: [],
      m: 'Cuádriceps, glúteos',
      tips: [
        'Brazos al frente para contrabalancear.',
        'Cadera atrás y abajo, rodillas en la línea de los pies.',
        'Bajá a una silla/banco si al principio te cuesta la profundidad.',
        'Para progresar: más lento al bajar (3–4 s) o pausa abajo.'
      ],
      errs: ['Talones que se levantan.', 'Espalda redondeada.'],
      yt: 'sentadilla sin peso técnica correcta'
    },

    // ---------------- Bisagra de cadera ----------------
    {
      id: 'rumano', n: 'Peso muerto rumano con barra', p: 'hinge', eq: ['gym'], tool: 'barra',
      img: 'Romanian_Deadlift', c: true, lvl: 1, r: 0.85, lower: true, avoid: ['lumbar'],
      m: 'Isquiotibiales, glúteos, espalda baja',
      tips: [
        'De pie con la barra en las manos, rodillas levemente flexionadas y fijas.',
        'Llevá la cadera hacia atrás (como cerrando una puerta con la cola) dejando que la barra baje rozando los muslos.',
        'Espalda neutra todo el tiempo; bajá hasta sentir estiramiento fuerte en isquios (aprox. mitad de la tibia).',
        'Subí empujando la cadera adelante y apretando glúteos, sin hiperextender la espalda.'
      ],
      errs: ['Redondear la espalda.', 'Separar la barra de las piernas.', 'Convertirlo en sentadilla flexionando mucho las rodillas.'],
      yt: 'peso muerto rumano técnica correcta'
    },
    {
      id: 'peso_muerto', n: 'Peso muerto convencional', p: 'hinge', eq: ['gym'], tool: 'barra',
      img: 'Barbell_Deadlift', c: true, lvl: 2, r: 1.2, lower: true, avoid: ['lumbar'],
      m: 'Cadena posterior completa, glúteos, espalda, trapecios',
      tips: [
        'Pies al ancho de cadera, barra sobre la mitad del pie.',
        'Agarrá la barra justo por fuera de las piernas; tibias tocan la barra.',
        'Pecho arriba, espalda neutra, "rompé la barra" (activá dorsales) antes de tirar.',
        'Empujá el piso con las piernas; la barra sube pegada al cuerpo. Arriba, cadera y rodillas se extienden juntas.',
        'Bajá con el mismo recorrido, cadera atrás primero.'
      ],
      errs: ['Espalda redondeada.', 'Cadera que sube antes que el pecho.', 'Hiperextender la lumbar arriba.'],
      yt: 'peso muerto convencional técnica correcta'
    },
    {
      id: 'rumano_db', n: 'Peso muerto rumano con mancuernas', p: 'hinge', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Stiff-Legged_Dumbbell_Deadlift', c: true, lvl: 1, r: 0.3, lower: true, avoid: ['lumbar'],
      m: 'Isquiotibiales, glúteos',
      tips: [
        'Mancuernas frente a los muslos, rodillas levemente flexionadas.',
        'Cadera atrás, espalda neutra, mancuernas rozando las piernas.',
        'Bajá hasta sentir estiramiento en isquios.',
        'Subí apretando glúteos.'
      ],
      errs: ['Redondear la espalda.', 'Mancuernas lejos del cuerpo.'],
      yt: 'peso muerto rumano mancuernas técnica'
    },
    {
      id: 'hip_thrust', n: 'Hip thrust con barra', p: 'hinge', eq: ['gym'], tool: 'barra',
      img: 'Barbell_Hip_Thrust', c: true, lvl: 1, r: 1.0, lower: true, avoid: [],
      m: 'Glúteos, isquiotibiales',
      tips: [
        'Espalda alta apoyada en un banco (borde bajo los omóplatos), barra sobre la cadera con almohadilla.',
        'Pies apoyados de modo que arriba las tibias queden verticales.',
        'Mentón hacia el pecho, subí la cadera hasta alinear rodilla-cadera-hombro.',
        'Apretá glúteos 1 segundo arriba y bajá controlado.'
      ],
      errs: ['Arquear la zona lumbar arriba en vez de extender la cadera.', 'Pies demasiado lejos o cerca.'],
      yt: 'hip thrust técnica correcta'
    },
    {
      id: 'puente', n: 'Puente de glúteos', p: 'hinge', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Butt_Lift_Bridge', c: true, lvl: 1, r: null, lower: true, avoid: [],
      m: 'Glúteos, isquiotibiales',
      tips: [
        'Boca arriba, rodillas flexionadas, pies apoyados al ancho de cadera.',
        'Retroversión pélvica leve y subí la cadera apretando glúteos.',
        'Pausa de 1–2 s arriba.',
        'Progresión: a una pierna o con mancuerna sobre la cadera.'
      ],
      errs: ['Empujar con la espalda baja en vez de con glúteos.'],
      yt: 'puente de glúteos técnica correcta'
    },
    {
      id: 'hiperextension', n: 'Hiperextensiones (extensión lumbar)', p: 'hinge', eq: ['gym'], tool: 'corporal',
      img: 'Hyperextensions_Back_Extensions', c: false, lvl: 1, r: null, lower: true, avoid: [],
      m: 'Erectores espinales, glúteos, isquios',
      tips: [
        'Almohadilla a la altura de la cadera, no del abdomen.',
        'Bajá con la espalda neutra flexionando la cadera.',
        'Subí hasta alinear el cuerpo, sin pasarte hacia atrás.'
      ],
      errs: ['Hiperextender la columna arriba.', 'Hacerlo con impulso.'],
      yt: 'hiperextensiones banco romano técnica'
    },

    // ---------------- Unilateral de pierna ----------------
    {
      id: 'bulgara', n: 'Sentadilla búlgara con mancuernas', p: 'lunge', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Split_Squat_with_Dumbbells', c: true, lvl: 1, r: 0.15, lower: true, avoid: ['rodilla'],
      m: 'Cuádriceps, glúteos',
      tips: [
        'Pie trasero apoyado en un banco, pie delantero a ~60–90 cm.',
        'Bajá en vertical hasta que la rodilla trasera casi toque el piso.',
        'Torso levemente inclinado adelante = más glúteo; erguido = más cuádriceps.',
        'Hacé todas las reps de una pierna y después cambiá.'
      ],
      errs: ['Pie delantero muy cerca (talón se levanta).', 'Rodilla delantera hacia adentro.'],
      yt: 'sentadilla búlgara técnica correcta'
    },
    {
      id: 'zancadas', n: 'Zancadas con mancuernas', p: 'lunge', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Dumbbell_Lunges', c: true, lvl: 1, r: 0.15, lower: true, avoid: ['rodilla'],
      m: 'Cuádriceps, glúteos',
      tips: [
        'Paso largo adelante, bajá hasta que ambas rodillas formen ~90°.',
        'Torso erguido, peso en el talón delantero.',
        'Volvé empujando con la pierna de adelante.'
      ],
      errs: ['Paso demasiado corto.', 'Rodilla delantera que colapsa hacia adentro.'],
      yt: 'zancadas con mancuernas técnica'
    },
    {
      id: 'step_up', n: 'Subida al cajón (step-up)', p: 'lunge', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Dumbbell_Step_Ups', c: true, lvl: 1, r: 0.12, lower: true, avoid: [],
      m: 'Cuádriceps, glúteos',
      tips: [
        'Cajón/banco a la altura de la rodilla o algo menos.',
        'Apoyá todo el pie arriba y subí empujando con esa pierna (no impulses con la de abajo).',
        'Bajá controlado.'
      ],
      errs: ['Impulsarse con la pierna de atrás.'],
      yt: 'step up mancuernas técnica'
    },
    {
      id: 'zancadas_corporal', n: 'Zancadas caminando (peso corporal)', p: 'lunge', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Bodyweight_Walking_Lunge', c: true, lvl: 1, r: null, lower: true, avoid: ['rodilla'],
      m: 'Cuádriceps, glúteos',
      tips: ['Pasos largos y controlados.', 'Rodilla trasera casi toca el piso.', 'Torso erguido.'],
      errs: ['Pasos cortos.', 'Perder el equilibrio por apurarse.'],
      yt: 'zancadas caminando técnica'
    },

    // ---------------- Aislados de pierna ----------------
    {
      id: 'curl_femoral', n: 'Curl femoral acostado', p: 'kneeFlex', eq: ['gym'], tool: 'maquina',
      img: 'Lying_Leg_Curls', c: false, lvl: 1, r: 0.4, lower: true, avoid: [],
      m: 'Isquiotibiales',
      tips: ['Rodilla alineada con el eje de la máquina.', 'Cadera pegada al banco.', 'Flexioná llevando los talones a los glúteos y bajá en 2–3 s.'],
      errs: ['Levantar la cadera.', 'Bajar sin control.'],
      yt: 'curl femoral acostado técnica'
    },
    {
      id: 'curl_femoral_sentado', n: 'Curl femoral sentado', p: 'kneeFlex', eq: ['gym'], tool: 'maquina',
      img: 'Seated_Leg_Curl', c: false, lvl: 1, r: 0.45, lower: true, avoid: [],
      m: 'Isquiotibiales',
      tips: ['Ajustá el rodillo sobre los tobillos y la traba sobre los muslos.', 'Torso levemente inclinado adelante aumenta el estiramiento.', 'Excéntrica lenta.'],
      errs: ['Rango corto.', 'Usar impulso.'],
      yt: 'curl femoral sentado técnica'
    },
    {
      id: 'curl_femoral_pelota', n: 'Curl femoral con pelota / toalla', p: 'kneeFlex', eq: ['db', 'bw'], tool: 'corporal',
      img: 'Ball_Leg_Curl', c: false, lvl: 1, r: null, lower: true, avoid: [],
      m: 'Isquiotibiales, glúteos',
      tips: ['Boca arriba, talones sobre una pelota (o sobre una toalla en piso liso).', 'Subí la cadera y flexioná rodillas trayendo los talones hacia vos.', 'Mantené la cadera arriba todo el tiempo.'],
      errs: ['Dejar caer la cadera.'],
      yt: 'curl femoral con fitball técnica'
    },
    {
      id: 'extension_cuad', n: 'Extensión de cuádriceps', p: 'kneeExt', eq: ['gym'], tool: 'maquina',
      img: 'Leg_Extensions', c: false, lvl: 1, r: 0.45, lower: true, avoid: ['rodilla'],
      m: 'Cuádriceps',
      tips: ['Eje de la máquina alineado con la rodilla.', 'Extendé completo y apretá 1 s arriba.', 'Bajá en 2–3 s.'],
      errs: ['Patear con impulso.', 'Levantar la cola del asiento.'],
      yt: 'extensión de cuádriceps máquina técnica'
    },
    {
      id: 'gemelos_pie', n: 'Gemelos de pie (máquina)', p: 'calves', eq: ['gym'], tool: 'maquina',
      img: 'Standing_Calf_Raises', c: false, lvl: 1, r: 0.8, lower: true, avoid: [],
      m: 'Gemelos',
      tips: ['Puntas en el borde, talones libres.', 'Bajá hasta el máximo estiramiento y pausa 1 s.', 'Subí lo más alto posible y apretá.'],
      errs: ['Rebotar.', 'Rango corto.'],
      yt: 'elevación de gemelos de pie técnica'
    },
    {
      id: 'gemelos_prensa', n: 'Gemelos en prensa', p: 'calves', eq: ['gym'], tool: 'maquina',
      img: 'Calf_Press_On_The_Leg_Press_Machine', c: false, lvl: 1, r: 1.3, lower: true, avoid: [],
      m: 'Gemelos',
      tips: ['Puntas de pie en el borde inferior de la plataforma, rodillas extendidas (sin trabar).', 'Recorrido completo con pausa abajo.'],
      errs: ['Flexionar rodillas para ayudarse.'],
      yt: 'gemelos en prensa técnica'
    },
    {
      id: 'gemelos_db', n: 'Gemelos con mancuerna', p: 'calves', eq: ['gym', 'db', 'bw'], tool: 'mancuernas',
      img: 'Standing_Dumbbell_Calf_Raise', c: false, lvl: 1, r: 0.2, lower: true, avoid: [],
      m: 'Gemelos',
      tips: ['Parate en un escalón con una mancuerna en la mano (o sin peso si estás en casa).', 'Apoyate en la pared para equilibrio.', 'Pausa abajo y arriba.'],
      errs: ['Rebotar.'],
      yt: 'elevación de talones con mancuerna escalón'
    },

    // ---------------- Empuje horizontal ----------------
    {
      id: 'press_banca', n: 'Press de banca con barra', p: 'hPush', eq: ['gym'], tool: 'barra',
      img: 'Barbell_Bench_Press_-_Medium_Grip', c: true, lvl: 1, r: 0.7, lower: false, avoid: ['hombro'],
      m: 'Pectoral, tríceps, deltoides anterior',
      tips: [
        'Ojos bajo la barra, omóplatos juntos y hacia abajo ("guardados en el bolsillo").',
        'Agarre algo más ancho que los hombros; muñecas rectas sobre los codos.',
        'Pies firmes en el piso, leve arco natural.',
        'Bajá la barra controlada a la zona baja del pecho con codos a ~45–70° del torso.',
        'Empujá hacia arriba y levemente hacia atrás. Usá un compañero o topes de seguridad.'
      ],
      errs: ['Codos abiertos a 90° (estrés en hombro).', 'Rebotar la barra en el pecho.', 'Levantar los glúteos del banco.'],
      yt: 'press de banca técnica correcta'
    },
    {
      id: 'press_banca_db', n: 'Press de banca con mancuernas', p: 'hPush', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Dumbbell_Bench_Press', c: true, lvl: 1, r: 0.25, lower: false, avoid: [],
      m: 'Pectoral, tríceps, deltoides anterior',
      tips: ['Omóplatos retraídos.', 'Bajá hasta que las mancuernas queden a la altura del pecho, codos a ~45°.', 'Subí juntando levemente las mancuernas arriba sin chocarlas.'],
      errs: ['Bajar demasiado con hombros adelantados.', 'Abrir los codos a 90°.'],
      yt: 'press de banca con mancuernas técnica'
    },
    {
      id: 'press_pecho_maquina', n: 'Press de pecho en máquina', p: 'hPush', eq: ['gym'], tool: 'maquina',
      img: 'Leverage_Chest_Press', c: true, lvl: 1, r: 0.6, lower: false, avoid: [],
      m: 'Pectoral, tríceps',
      tips: ['Asiento a la altura en que las manijas queden a mitad del pecho.', 'Espalda apoyada, omóplatos juntos.', 'Empujá sin trabar los codos y volvé controlado.'],
      errs: ['Despegar la espalda del respaldo.'],
      yt: 'press de pecho en máquina técnica'
    },
    {
      id: 'flexiones', n: 'Flexiones de brazos', p: 'hPush', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Pushups', c: true, lvl: 1, r: null, lower: false, avoid: [],
      m: 'Pectoral, tríceps, core',
      tips: ['Manos algo más anchas que los hombros.', 'Cuerpo en línea recta (glúteos y abdomen apretados).', 'Bajá hasta casi tocar el piso con el pecho, codos a ~45°.', 'Si no llegás a 8, hacelas con las manos elevadas (banco/mesa).'],
      errs: ['Cadera caída o muy arriba.', 'Codos a 90°.', 'Recorrido corto.'],
      yt: 'flexiones de brazos técnica correcta'
    },
    {
      id: 'flexiones_inclinadas', n: 'Flexiones con manos elevadas', p: 'hPush', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Incline_Push-Up', c: true, lvl: 1, r: null, lower: false, avoid: [],
      m: 'Pectoral, tríceps',
      tips: ['Manos sobre un banco o mesa firme.', 'Cuerpo recto.', 'Cuanto más bajo el apoyo, más difícil.'],
      errs: ['Cadera caída.'],
      yt: 'flexiones inclinadas principiantes técnica'
    },

    // ---------------- Empuje inclinado ----------------
    {
      id: 'press_inclinado_db', n: 'Press inclinado con mancuernas', p: 'incPush', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Incline_Dumbbell_Press', c: true, lvl: 1, r: 0.22, lower: false, avoid: [],
      m: 'Pectoral superior, deltoides anterior, tríceps',
      tips: ['Banco a 30° (no más de 45°).', 'Omóplatos juntos.', 'Bajá hasta la altura de la parte alta del pecho, codos a ~45°.'],
      errs: ['Banco demasiado vertical (se vuelve press de hombros).', 'Arquear exageradamente.'],
      yt: 'press inclinado con mancuernas técnica'
    },
    {
      id: 'press_inclinado', n: 'Press inclinado con barra', p: 'incPush', eq: ['gym'], tool: 'barra',
      img: 'Barbell_Incline_Bench_Press_-_Medium_Grip', c: true, lvl: 1, r: 0.6, lower: false, avoid: ['hombro'],
      m: 'Pectoral superior, deltoides anterior, tríceps',
      tips: ['Banco a 30°.', 'Bajá la barra a la parte alta del pecho, debajo de las clavículas.', 'Omóplatos juntos y pies firmes.'],
      errs: ['Rebotar.', 'Codos a 90°.'],
      yt: 'press inclinado con barra técnica'
    },
    {
      id: 'flexiones_declinadas', n: 'Flexiones con pies elevados', p: 'incPush', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Decline_Push-Up', c: true, lvl: 2, r: null, lower: false, avoid: [],
      m: 'Pectoral superior, hombros, tríceps',
      tips: ['Pies sobre un banco/silla.', 'Cuerpo recto, bajá controlado.'],
      errs: ['Cadera caída.'],
      yt: 'flexiones declinadas técnica'
    },

    // ---------------- Empuje vertical ----------------
    {
      id: 'press_militar', n: 'Press militar de pie con barra', p: 'vPush', eq: ['gym'], tool: 'barra',
      img: 'Standing_Military_Press', c: true, lvl: 2, r: 0.45, lower: false, avoid: ['hombro', 'lumbar'],
      m: 'Deltoides, tríceps, core',
      tips: ['Barra apoyada en la parte alta del pecho, agarre apenas más ancho que los hombros.', 'Glúteos y abdomen apretados (no arquees la lumbar).', 'Empujá en línea recta; corré la cabeza atrás para que pase la barra y volvé a meterla debajo arriba.'],
      errs: ['Hiperextender la lumbar.', 'Empujar la barra hacia adelante.'],
      yt: 'press militar con barra técnica correcta'
    },
    {
      id: 'press_hombro_db', n: 'Press de hombros con mancuernas (sentado)', p: 'vPush', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Dumbbell_Shoulder_Press', c: true, lvl: 1, r: 0.17, lower: false, avoid: ['hombro'],
      m: 'Deltoides, tríceps',
      tips: ['Respaldo a ~80–90°.', 'Mancuernas a la altura de las orejas, codos levemente adelante del torso.', 'Empujá hacia arriba sin chocarlas.'],
      errs: ['Arquear la espalda.', 'Bajar poco.'],
      yt: 'press de hombros con mancuernas técnica'
    },
    {
      id: 'press_hombro_maquina', n: 'Press de hombros en máquina', p: 'vPush', eq: ['gym'], tool: 'maquina',
      img: 'Leverage_Shoulder_Press', c: true, lvl: 1, r: 0.4, lower: false, avoid: [],
      m: 'Deltoides, tríceps',
      tips: ['Asiento a la altura en que las manijas queden a la altura de los hombros.', 'Espalda apoyada.', 'Recorrido completo y controlado.'],
      errs: ['Despegar la espalda.'],
      yt: 'press de hombros en máquina técnica'
    },

    // ---------------- Tracción horizontal ----------------
    {
      id: 'remo_polea', n: 'Remo sentado en polea', p: 'hPull', eq: ['gym'], tool: 'polea',
      img: 'Seated_Cable_Rows', c: true, lvl: 1, r: 0.6, lower: false, avoid: [],
      m: 'Dorsales, romboides, trapecio medio, bíceps',
      tips: ['Torso erguido, leve flexión de rodillas.', 'Tirá llevando los codos atrás pegados al cuerpo hasta el abdomen.', 'Juntá los omóplatos al final y volvé estirando los brazos sin encorvarte.'],
      errs: ['Balancear el torso.', 'Encoger los hombros.'],
      yt: 'remo sentado en polea técnica correcta'
    },
    {
      id: 'remo_barra', n: 'Remo con barra', p: 'hPull', eq: ['gym'], tool: 'barra',
      img: 'Bent_Over_Barbell_Row', c: true, lvl: 2, r: 0.6, lower: false, avoid: ['lumbar'],
      m: 'Dorsales, romboides, espalda baja (isométrico)',
      tips: ['Bisagra de cadera a ~45°, espalda neutra, rodillas flexionadas.', 'Tirá la barra hacia el ombligo con los codos atrás.', 'No uses impulso del torso.'],
      errs: ['Redondear la espalda.', 'Levantar el torso en cada rep.'],
      yt: 'remo con barra técnica correcta'
    },
    {
      id: 'remo_db', n: 'Remo con mancuerna a una mano', p: 'hPull', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'One-Arm_Dumbbell_Row', c: true, lvl: 1, r: 0.3, lower: false, avoid: [],
      m: 'Dorsales, romboides, bíceps',
      tips: ['Mano y rodilla del mismo lado apoyadas en el banco, espalda plana.', 'Tirá la mancuerna hacia la cadera (no hacia el hombro).', 'Bajá estirando completo.'],
      errs: ['Rotar el torso.', 'Tirar con el bíceps.'],
      yt: 'remo con mancuerna a una mano técnica'
    },
    {
      id: 'remo_pecho_apoyado', n: 'Remo con mancuernas pecho apoyado', p: 'hPull', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Dumbbell_Incline_Row', c: true, lvl: 1, r: 0.22, lower: false, avoid: [],
      m: 'Espalda media, dorsales',
      tips: ['Pecho apoyado en un banco inclinado a ~30–45°.', 'Tirá los codos atrás y juntá omóplatos.', 'Ideal si tenés molestias lumbares.'],
      errs: ['Despegar el pecho del banco.'],
      yt: 'remo pecho apoyado mancuernas técnica'
    },
    {
      id: 'remo_invertido', n: 'Remo invertido', p: 'hPull', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Inverted_Row', c: true, lvl: 1, r: null, lower: false, avoid: [],
      m: 'Espalda, bíceps',
      tips: ['Colgado de una barra baja (o mesa firme) con el cuerpo recto.', 'Tirá el pecho hacia la barra.', 'Más horizontal = más difícil.'],
      errs: ['Cadera caída.'],
      yt: 'remo invertido técnica'
    },

    // ---------------- Tracción vertical ----------------
    {
      id: 'jalon', n: 'Jalón al pecho', p: 'vPull', eq: ['gym'], tool: 'polea',
      img: 'Wide-Grip_Lat_Pulldown', c: true, lvl: 1, r: 0.6, lower: false, avoid: [],
      m: 'Dorsales, bíceps',
      tips: ['Agarre algo más ancho que los hombros, muslos trabados bajo el rodillo.', 'Pecho arriba, leve inclinación atrás.', 'Llevá la barra a la parte alta del pecho tirando con los codos hacia abajo.', 'Subí controlado hasta estirar los brazos.'],
      errs: ['Bajar la barra detrás de la nuca.', 'Balancear el torso.'],
      yt: 'jalón al pecho técnica correcta'
    },
    {
      id: 'dominadas', n: 'Dominadas', p: 'vPull', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Pullups', c: true, lvl: 2, r: null, lower: false, avoid: [],
      m: 'Dorsales, bíceps, core',
      tips: ['Agarre prono algo más ancho que los hombros.', 'Iniciá bajando los omóplatos y llevá el pecho a la barra.', 'Bajá completo y controlado.', 'Si no llegás a 5, usá banda elástica o máquina asistida.'],
      errs: ['Medio recorrido.', 'Balancearse (kipping).'],
      yt: 'dominadas técnica correcta'
    },
    {
      id: 'dominadas_asistidas', n: 'Dominadas asistidas con banda', p: 'vPull', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Band_Assisted_Pull-Up', c: true, lvl: 1, r: null, lower: false, avoid: [],
      m: 'Dorsales, bíceps',
      tips: ['Banda enganchada a la barra y bajo una rodilla o pie.', 'Misma técnica que la dominada.', 'Progresá usando bandas más finas.'],
      errs: ['Rebotar en la banda abajo.'],
      yt: 'dominadas asistidas con banda técnica'
    },
    {
      id: 'pullover_db', n: 'Pullover con mancuerna', p: 'vPull', eq: ['db'], tool: 'mancuernas',
      img: 'Bent-Arm_Dumbbell_Pullover', c: false, lvl: 1, r: 0.2, lower: false, avoid: ['hombro'],
      m: 'Dorsales, pectoral',
      tips: ['Acostado en un banco, una mancuerna sostenida con ambas manos sobre el pecho.', 'Bajá detrás de la cabeza con codos levemente flexionados hasta sentir estiramiento.', 'Volvé tirando con los dorsales.'],
      errs: ['Bajar más allá de lo que permite el hombro.'],
      yt: 'pullover con mancuerna técnica'
    },

    // ---------------- Accesorios de tren superior ----------------
    {
      id: 'aperturas_maquina', n: 'Aperturas en máquina (pec deck)', p: 'fly', eq: ['gym'], tool: 'maquina',
      img: 'Butterfly', c: false, lvl: 1, r: 0.35, lower: false, avoid: [],
      m: 'Pectoral',
      tips: ['Manijas a la altura del pecho.', 'Codos levemente flexionados y fijos.', 'Juntá adelante apretando el pecho y volvé controlado.'],
      errs: ['Ir demasiado atrás forzando el hombro.'],
      yt: 'aperturas pec deck técnica'
    },
    {
      id: 'cruce_poleas', n: 'Cruce de poleas', p: 'fly', eq: ['gym'], tool: 'polea',
      img: 'Cable_Crossover', c: false, lvl: 1, r: 0.15, lower: false, avoid: [],
      m: 'Pectoral',
      tips: ['Un paso adelante, torso levemente inclinado.', 'Movimiento de "abrazo" con codos semiflexionados.', 'Juntá las manos frente al pecho.'],
      errs: ['Convertirlo en press flexionando mucho los codos.'],
      yt: 'cruce de poleas técnica'
    },
    {
      id: 'aperturas_db', n: 'Aperturas con mancuernas', p: 'fly', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Dumbbell_Flyes', c: false, lvl: 1, r: 0.1, lower: false, avoid: ['hombro'],
      m: 'Pectoral',
      tips: ['Codos levemente flexionados y fijos.', 'Bajá en arco hasta sentir estiramiento sin pasar la línea del torso.', 'Subí como abrazando un barril.'],
      errs: ['Bajar demasiado.', 'Usar mucho peso.'],
      yt: 'aperturas con mancuernas técnica'
    },
    {
      id: 'elevaciones_laterales', n: 'Elevaciones laterales', p: 'lateral', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Side_Lateral_Raise', c: false, lvl: 1, r: 0.07, lower: false, avoid: [],
      m: 'Deltoides lateral',
      tips: ['Leve inclinación del torso adelante, codos apenas flexionados.', 'Subí los brazos hacia los costados hasta la altura de los hombros, guiando con los codos.', 'Bajá en 2–3 s. Peso liviano, técnica estricta.'],
      errs: ['Encoger los trapecios.', 'Balancearse.'],
      yt: 'elevaciones laterales técnica correcta'
    },
    {
      id: 'laterales_polea', n: 'Elevación lateral en polea', p: 'lateral', eq: ['gym'], tool: 'polea',
      img: 'Cable_Seated_Lateral_Raise', c: false, lvl: 1, r: 0.05, lower: false, avoid: [],
      m: 'Deltoides lateral',
      tips: ['Polea baja, cable por delante o detrás del cuerpo.', 'Subí hasta la altura del hombro.', 'Tensión constante, sin impulso.'],
      errs: ['Encoger hombros.'],
      yt: 'elevación lateral en polea técnica'
    },
    {
      id: 'face_pull', n: 'Face pull', p: 'rear', eq: ['gym'], tool: 'polea',
      img: 'Face_Pull', c: false, lvl: 1, r: 0.25, lower: false, avoid: [],
      m: 'Deltoides posterior, manguito rotador, trapecio medio',
      tips: ['Polea a la altura de la cara con soga.', 'Tirá hacia la frente separando las manos y rotando los hombros hacia afuera.', 'Pausa 1 s atrás. Muy bueno para la salud del hombro.'],
      errs: ['Tirar hacia el cuello con los codos bajos.', 'Demasiado peso.'],
      yt: 'face pull técnica correcta'
    },
    {
      id: 'pajaros', n: 'Pájaros (vuelos posteriores)', p: 'rear', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Reverse_Flyes', c: false, lvl: 1, r: 0.05, lower: false, avoid: [],
      m: 'Deltoides posterior',
      tips: ['Torso inclinado casi paralelo al piso (o pecho apoyado en banco).', 'Abrí los brazos hacia los costados con codos semiflexionados.', 'Peso liviano y controlado.'],
      errs: ['Usar impulso.', 'Juntar demasiado los omóplatos (se vuelve remo).'],
      yt: 'pájaros deltoides posterior técnica'
    },
    {
      id: 'pajaros_maquina', n: 'Pec deck invertido', p: 'rear', eq: ['gym'], tool: 'maquina',
      img: 'Reverse_Machine_Flyes', c: false, lvl: 1, r: 0.2, lower: false, avoid: [],
      m: 'Deltoides posterior',
      tips: ['Pecho contra el respaldo.', 'Abrí los brazos hacia atrás con codos semiflexionados.', 'Pausa breve atrás.'],
      errs: ['Encoger hombros.'],
      yt: 'reverse pec deck técnica'
    },
    {
      id: 'curl_barra', n: 'Curl de bíceps con barra', p: 'biceps', eq: ['gym'], tool: 'barra',
      img: 'Barbell_Curl', c: false, lvl: 1, r: 0.3, lower: false, avoid: [],
      m: 'Bíceps',
      tips: ['Codos pegados al cuerpo y quietos.', 'Subí sin balancear el torso.', 'Bajá en 2–3 s hasta extender completo.'],
      errs: ['Balanceo.', 'Codos que se adelantan.'],
      yt: 'curl de bíceps con barra técnica'
    },
    {
      id: 'curl_db', n: 'Curl de bíceps con mancuernas', p: 'biceps', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Dumbbell_Bicep_Curl', c: false, lvl: 1, r: 0.11, lower: false, avoid: [],
      m: 'Bíceps',
      tips: ['Supiná (girá la palma hacia arriba) mientras subís.', 'Codos fijos.', 'Excéntrica lenta.'],
      errs: ['Balanceo.'],
      yt: 'curl de bíceps con mancuernas técnica'
    },
    {
      id: 'curl_martillo', n: 'Curl martillo', p: 'biceps', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Hammer_Curls', c: false, lvl: 1, r: 0.12, lower: false, avoid: [],
      m: 'Braquial, braquiorradial, bíceps',
      tips: ['Palmas enfrentadas (agarre neutro).', 'Codos fijos al costado.', 'Subí y bajá controlado.'],
      errs: ['Balanceo.'],
      yt: 'curl martillo técnica'
    },
    {
      id: 'triceps_polea', n: 'Extensión de tríceps en polea (soga)', p: 'triceps', eq: ['gym'], tool: 'polea',
      img: 'Triceps_Pushdown_-_Rope_Attachment', c: false, lvl: 1, r: 0.3, lower: false, avoid: [],
      m: 'Tríceps',
      tips: ['Codos pegados al cuerpo y fijos.', 'Extendé completo separando la soga abajo.', 'Volvé hasta ~90° sin mover los codos.'],
      errs: ['Mover los hombros/codos.', 'Inclinarse demasiado sobre la polea.'],
      yt: 'extensión de tríceps en polea con soga técnica'
    },
    {
      id: 'press_frances', n: 'Press francés con barra Z', p: 'triceps', eq: ['gym'], tool: 'barra',
      img: 'Lying_Triceps_Press', c: false, lvl: 2, r: 0.25, lower: false, avoid: ['hombro'],
      m: 'Tríceps',
      tips: ['Acostado, brazos verticales o levemente inclinados hacia atrás.', 'Flexioná solo los codos llevando la barra hacia la frente.', 'Extendé sin abrir los codos.'],
      errs: ['Abrir los codos.', 'Mover los hombros.'],
      yt: 'press francés técnica correcta'
    },
    {
      id: 'triceps_db', n: 'Extensión de tríceps sobre la cabeza (mancuerna)', p: 'triceps', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Standing_Dumbbell_Triceps_Extension', c: false, lvl: 1, r: 0.18, lower: false, avoid: ['hombro'],
      m: 'Tríceps (porción larga)',
      tips: ['Una mancuerna con ambas manos sobre la cabeza.', 'Bajá detrás de la cabeza con codos apuntando arriba.', 'Extendé completo. Sentado si te cuesta estabilizar.'],
      errs: ['Codos muy abiertos.', 'Arquear la espalda.'],
      yt: 'extensión de tríceps con mancuerna sobre la cabeza'
    },
    {
      id: 'fondos_banco', n: 'Fondos en banco', p: 'triceps', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Bench_Dips', c: false, lvl: 1, r: null, lower: false, avoid: ['hombro'],
      m: 'Tríceps',
      tips: ['Manos en el borde de un banco, espalda pegada a él.', 'Bajá hasta ~90° de codo, no más.', 'Rodillas flexionadas = más fácil.'],
      errs: ['Bajar demasiado (estrés en hombro).', 'Alejar la espalda del banco.'],
      yt: 'fondos en banco técnica'
    },

    // ---------------- Core ----------------
    {
      id: 'plancha', n: 'Plancha', p: 'core', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Plank', c: false, lvl: 1, r: null, lower: false, time: true, avoid: [],
      m: 'Abdomen, core',
      tips: ['Antebrazos bajo los hombros.', 'Cuerpo recto: apretá glúteos y llevá el ombligo hacia la columna.', 'Respirá normalmente.'],
      errs: ['Cadera caída.', 'Cola muy arriba.'],
      yt: 'plancha abdominal técnica correcta'
    },
    {
      id: 'dead_bug', n: 'Dead bug', p: 'core', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Dead_Bug', c: false, lvl: 1, r: null, lower: false, avoid: [],
      m: 'Abdomen profundo',
      tips: ['Boca arriba, brazos al techo, rodillas a 90°.', 'Lumbar pegada al piso todo el tiempo.', 'Extendé brazo y pierna opuestos lentamente y volvé.'],
      errs: ['Despegar la lumbar.', 'Apurarse.'],
      yt: 'dead bug ejercicio técnica'
    },
    {
      id: 'pallof', n: 'Press Pallof', p: 'core', eq: ['gym'], tool: 'polea',
      img: 'Pallof_Press', c: false, lvl: 1, r: 0.12, lower: false, avoid: [],
      m: 'Core antirrotación, oblicuos',
      tips: ['De costado a la polea a la altura del pecho.', 'Extendé los brazos al frente resistiendo la rotación.', 'Pausa 2 s y volvé. Ambos lados.'],
      errs: ['Girar el torso.'],
      yt: 'press pallof técnica'
    },
    {
      id: 'crunch_polea', n: 'Crunch en polea alta', p: 'core', eq: ['gym'], tool: 'polea',
      img: 'Cable_Crunch', c: false, lvl: 1, r: 0.35, lower: false, avoid: ['lumbar'],
      m: 'Recto abdominal',
      tips: ['De rodillas, soga a los costados de la cabeza.', 'Flexioná la columna llevando los codos a los muslos.', 'La cadera no se mueve.'],
      errs: ['Tirar con los brazos.', 'Sentarse sobre los talones.'],
      yt: 'crunch en polea técnica'
    },
    {
      id: 'elev_piernas', n: 'Elevación de piernas colgado', p: 'core', eq: ['gym'], tool: 'corporal',
      img: 'Hanging_Leg_Raise', c: false, lvl: 2, r: null, lower: false, avoid: [],
      m: 'Abdomen inferior, flexores de cadera',
      tips: ['Colgado de una barra, sin balanceo.', 'Subí las rodillas (o piernas rectas) enrollando la pelvis.', 'Bajá controlado.'],
      errs: ['Balanceo.'],
      yt: 'elevación de piernas colgado técnica'
    },
    {
      id: 'plancha_lateral', n: 'Plancha lateral', p: 'core', eq: ['gym', 'db', 'bw'], tool: 'corporal',
      img: 'Side_Bridge', c: false, lvl: 1, r: null, lower: false, time: true, avoid: [],
      m: 'Oblicuos, glúteo medio',
      tips: ['Codo bajo el hombro.', 'Cuerpo recto de cabeza a pies.', 'Ambos lados (el tiempo indicado es por lado).'],
      errs: ['Cadera caída.'],
      yt: 'plancha lateral técnica'
    },

    // ---------------- Variantes de rutinas de profesor ----------------
    {
      id: 'sentadilla_espanola', extra: true, n: 'Sentadilla española', p: 'squat', eq: ['gym'], tool: 'disco',
      img: 'Bodyweight_Squat', c: true, lvl: 1, r: 0.15, lower: true, avoid: [],
      m: 'Cuádriceps (con poca carga en la rodilla)',
      tips: [
        'Banda o cinta gruesa atada a un soporte fijo y pasada por detrás de las rodillas (a la altura del hueco poplíteo).',
        'Alejate hasta que la banda quede tensa; pies al ancho de cadera. El peso (disco o mancuerna) va sostenido contra el pecho.',
        'Bajá llevando las rodillas hacia atrás contra la banda, con las tibias casi verticales y el torso erguido.',
        'Subí empujando con todo el pie. La imagen es de referencia: buscá el video para ver la colocación de la banda.'
      ],
      errs: ['Banda floja (se pierde el efecto).', 'Inclinar el torso hacia adelante.', 'Despegar los talones.'],
      yt: 'sentadilla española técnica banda'
    },
    {
      id: 'prensa_horizontal', extra: true, n: 'Prensa horizontal', p: 'squat', eq: ['gym'], tool: 'maquina',
      img: 'Leg_Press', c: true, lvl: 1, r: 1.0, lower: true, avoid: [],
      m: 'Cuádriceps, glúteos',
      tips: ['Espalda y cadera apoyadas en el respaldo.', 'Pies al ancho de hombros en el centro de la plataforma.', 'Flexioná hasta ~90° de rodilla sin despegar la cadera.', 'Extendé sin trabar las rodillas.'],
      errs: ['Despegar la cadera.', 'Bloquear las rodillas.'],
      yt: 'prensa horizontal sentado técnica'
    },
    {
      id: 'press_maquina_neutra', extra: true, n: 'Press de pecho en máquina (agarre neutro)', p: 'hPush', eq: ['gym'], tool: 'maquina',
      img: 'Machine_Bench_Press', c: true, lvl: 1, r: 0.6, lower: false, avoid: [],
      m: 'Pectoral, tríceps',
      tips: ['Manijas con las palmas enfrentadas, a la altura de la mitad del pecho.', 'Espalda apoyada y omóplatos juntos.', 'Codos cerca del cuerpo (~45°).', 'Volvé controlado sin perder la postura.'],
      errs: ['Despegar la espalda.', 'Encoger los hombros.'],
      yt: 'press pecho maquina agarre neutro técnica'
    },
    {
      id: 'triceps_polea_1brazo', extra: true, n: 'Tríceps en polea a un brazo', p: 'triceps', eq: ['gym'], tool: 'polea',
      img: 'Cable_One_Arm_Tricep_Extension', c: false, lvl: 1, r: 0.12, lower: false, avoid: [],
      m: 'Tríceps',
      tips: ['Polea alta con manija simple.', 'Codo pegado al costado y fijo.', 'Extendé completo y volvé a ~90°.', 'Hacé todas las reps con un brazo y cambiá.'],
      errs: ['Mover el hombro.', 'Inclinar el torso para ayudarse.'],
      yt: 'extensión de tríceps en polea a una mano técnica'
    },
    {
      id: 'rumano_db_disco', extra: true, n: 'Peso muerto con mancuernas (punta de pies en disco)', p: 'hinge', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'Stiff-Legged_Dumbbell_Deadlift', c: true, lvl: 1, r: 0.3, lower: true, avoid: ['lumbar'],
      m: 'Isquiotibiales, glúteos',
      tips: ['Puntas de los pies apoyadas sobre un disco y talones en el piso: aumenta el estiramiento de isquios.', 'Rodillas apenas flexionadas, cadera atrás, espalda neutra.', 'Mancuernas rozando las piernas, bajá hasta sentir el estiramiento.', 'Subí apretando glúteos.'],
      errs: ['Redondear la espalda.', 'Flexionar demasiado las rodillas.'],
      yt: 'peso muerto rumano mancuernas puntas elevadas'
    },
    {
      id: 'remo_estocada', extra: true, n: 'Remo en estocada (polea, un brazo)', p: 'hPull', eq: ['gym'], tool: 'polea',
      img: 'Seated_One-arm_Cable_Pulley_Rows', c: true, lvl: 1, r: 0.3, lower: false, avoid: [],
      m: 'Dorsal, espalda media, core',
      tips: ['De pie en posición de estocada (pierna opuesta al brazo que tira adelante).', 'Torso estable, sin rotar.', 'Tirá el codo hacia atrás y hacia la cadera.', 'Volvé estirando el brazo sin perder la postura. Reps indicadas por lado.'],
      errs: ['Rotar el torso.', 'Encoger el hombro.'],
      yt: 'remo en estocada polea un brazo'
    },
    {
      id: 'biceps_polea_soga', extra: true, n: 'Bíceps en polea con soga', p: 'biceps', eq: ['gym'], tool: 'polea',
      img: 'Cable_Hammer_Curls_-_Rope_Attachment', c: false, lvl: 1, r: 0.3, lower: false, avoid: [],
      m: 'Bíceps, braquial',
      tips: ['Polea baja con soga, agarre neutro.', 'Codos pegados y fijos.', 'Subí hasta contraer y bajá controlado.'],
      errs: ['Balancear el torso.', 'Adelantar los codos.'],
      yt: 'curl martillo polea soga técnica'
    },
    {
      id: 'abductor', extra: true, n: 'Abductor en máquina', p: 'abduct', eq: ['gym'], tool: 'maquina',
      img: 'Thigh_Abductor', c: false, lvl: 1, r: 0.5, lower: true, avoid: [],
      m: 'Glúteo medio y menor',
      tips: ['Espalda apoyada (o torso levemente inclinado adelante para más glúteo).', 'Abrí las piernas de forma controlada.', 'Pausa 1 s afuera y volvé lento.'],
      errs: ['Rebotar con el peso.', 'Rango corto.'],
      yt: 'abductor maquina técnica glúteo medio'
    },
    {
      id: 'vuelos_frontales_soga', extra: true, n: 'Vuelos frontales en polea con soga', p: 'front', eq: ['gym'], tool: 'polea',
      img: 'Front_Cable_Raise', c: false, lvl: 1, r: 0.15, lower: false, avoid: [],
      m: 'Deltoides anterior',
      tips: ['De espaldas a la polea baja, soga entre las piernas.', 'Brazos casi rectos, subí al frente hasta la altura de los hombros.', 'Bajá controlado, sin balanceo.'],
      errs: ['Balancear el torso.', 'Subir por encima de la cabeza.'],
      yt: 'elevación frontal polea soga técnica'
    },
    {
      id: 'serrucho', extra: true, n: 'Serrucho (remo a un brazo, 2 apoyos en banco)', p: 'hPull', eq: ['gym', 'db'], tool: 'mancuernas',
      img: 'One-Arm_Dumbbell_Row', c: true, lvl: 1, r: 0.3, lower: false, avoid: [],
      m: 'Dorsal, romboides, bíceps',
      tips: ['Mano y rodilla del mismo lado sobre el banco, espalda plana.', 'Tirá la mancuerna hacia la cadera ("serruchando").', 'Bajá estirando completo. Reps indicadas por lado.'],
      errs: ['Rotar el torso.', 'Tirar con el bíceps.'],
      yt: 'remo serrucho mancuerna técnica'
    },
    {
      id: 'vuelos_posteriores_banco', extra: true, n: 'Vuelos posteriores en T con pecho apoyado', p: 'rear', eq: ['gym', 'db'], tool: 'maquina',
      img: 'Dumbbell_Lying_Rear_Lateral_Raise', c: false, lvl: 1, r: 0.05, lower: false, avoid: [],
      m: 'Deltoides posterior, trapecio medio',
      tips: ['Pecho apoyado en un banco inclinado.', 'Abrí los brazos hacia los costados formando una "T", codos levemente flexionados.', 'Pausa arriba juntando omóplatos y bajá controlado.'],
      errs: ['Usar impulso.', 'Encoger los hombros.'],
      yt: 'vuelos posteriores pecho apoyado banco técnica'
    },

    // ---------------- Cardio ----------------
    {
      id: 'cinta_inclinada', n: 'Caminata en cinta inclinada', p: 'cardio', eq: ['gym'], tool: 'maquina',
      img: 'Walking_Treadmill', c: false, lvl: 1, r: null, lower: true, avoid: [],
      m: 'Cardio de baja intensidad (LISS)',
      tips: ['Inclinación 6–12 %, velocidad 4,5–6 km/h.', 'Sin agarrarte de la baranda.', 'Intensidad: podés hablar en frases cortas.'],
      errs: ['Colgarse de la baranda.'],
      yt: 'caminata inclinada en cinta beneficios'
    },
    {
      id: 'bici', n: 'Bicicleta fija', p: 'cardio', eq: ['gym'], tool: 'maquina',
      img: 'Bicycling_Stationary', c: false, lvl: 1, r: null, lower: true, avoid: [],
      m: 'Cardio',
      tips: ['Asiento a la altura de la cadera; rodilla apenas flexionada abajo.', 'Ritmo sostenido, intensidad moderada.'],
      errs: ['Asiento muy bajo (molestia en rodillas).'],
      yt: 'altura correcta asiento bicicleta fija'
    },
    {
      id: 'eliptico', n: 'Elíptico', p: 'cardio', eq: ['gym'], tool: 'maquina',
      img: 'Elliptical_Trainer', c: false, lvl: 1, r: null, lower: true, avoid: [],
      m: 'Cardio de bajo impacto',
      tips: ['Postura erguida, empujá y tirá con los brazos.', 'Bajo impacto: ideal con molestias articulares.'],
      errs: ['Encorvarse.'],
      yt: 'eliptico técnica correcta'
    },
    {
      id: 'soga', n: 'Saltar la soga / caminata rápida', p: 'cardio', eq: ['db', 'bw'], tool: 'corporal',
      img: 'Rope_Jumping', c: false, lvl: 1, r: null, lower: true, avoid: ['rodilla'],
      m: 'Cardio',
      tips: ['Saltos bajos sobre la punta de los pies.', 'Si tenés molestias de rodilla, reemplazalo por caminata rápida.'],
      errs: ['Saltar demasiado alto.'],
      yt: 'saltar la soga técnica principiantes'
    }
  ];

  const BY_ID = {};
  EXERCISES.forEach((e) => { BY_ID[e.id] = e; });

  const PATTERN_NAMES = {
    squat: 'Sentadilla / prensa',
    hinge: 'Bisagra de cadera',
    lunge: 'Unilateral de pierna',
    kneeFlex: 'Isquiotibiales',
    kneeExt: 'Cuádriceps (aislado)',
    calves: 'Gemelos',
    hPush: 'Empuje horizontal',
    incPush: 'Empuje inclinado',
    vPush: 'Empuje vertical',
    hPull: 'Remo',
    vPull: 'Tracción vertical',
    fly: 'Pectoral (aislado)',
    lateral: 'Hombro lateral',
    rear: 'Hombro posterior',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    abduct: 'Abductores / glúteo medio',
    front: 'Hombro frontal',
    core: 'Core / abdomen',
    cardio: 'Cardio'
  };

  const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

  const api = { EXERCISES, BY_ID, PATTERN_NAMES, IMG_BASE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GymExercises = api;
})(typeof self !== 'undefined' ? self : this);
