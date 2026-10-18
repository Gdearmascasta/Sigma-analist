/* ==========================================================================
   Regla de scroll · índice vivo de secciones
   Inspirado en el instrumento de las páginas de app de getartcraft.com.

   Cada sección marcada con [data-section][data-label] tiene un título que
   pasa por cinco estados, calculados SOLO a partir de scrollY (así el efecto
   es reversible y no acumula estado):

     cola (abajo, pequeño) → viajando (vertical, junto a la regla, a la altura
     de su sección) → giro letra a letra → actual (grande, arriba) → pila
     (pequeño, arriba, bajo la navegación)

   Sin dependencias. API mínima en window.CreinnovaRuler.
   ========================================================================== */
(function () {
  'use strict';

  const CFG = {
    minWidth: 1100,     // por debajo se usa el indicador compacto
    railW: 64,          // ancho de la regla
    edgePad: 14,        // margen vertical de la regla
    majorEvery: 5,      // marca larga cada 5 %
    labelEvery: 10,     // número cada 10 %
    flipLine: 0.12,     // % de alto de pantalla (bajo la nav) donde acaba el giro
    flipZone: 320,      // px de scroll que dura el giro vertical → horizontal
    detachZone: 300,    // px de scroll que dura el paso de la cola a la regla
    headingPx: 42,      // tamaño del título actual
    ridingPx: 24,       // tamaño del título que viaja en vertical
    queuePx: 16,        // tamaño en cola y en pila
    topPad: 22,
    currentGap: 26,
    slot: 23,           // separación entre títulos apilados
    queuePad: 30,
    textPad: 10,        // hueco entre la regla y los títulos
    stagger: 0.5,       // desfase entre letras en el giro (0 = todas a la vez)
    arc: 40,            // cuánto se curva hacia la página la trayectoria de cada letra
    queueAlpha: 0.55,
    ridingAlpha: 0.7,
    jumpMax: 1.4,       // s, duración máxima de un salto por clic
    snapDelay: 400,     // ms de reposo antes de completar un giro a medias
    snapDur: 0.9,
    introDur: 0.8,
    introStagger: 0.008,
    velRadius: 70,      // px (en la regla) alrededor de la aguja que reaccionan a la velocidad
    velMax: 0.9,
    mapDelay: 150,      // ms de intención antes de abrir el mapa
    dragLerp: 0.18,
    needleFadePct: 3,
  };

  const root = document.getElementById('ruler');
  const mini = document.getElementById('mini-ruler');
  if (!root) return;

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = reduceMQ.matches;
  reduceMQ.addEventListener?.('change', (e) => { reduce = e.matches; });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // ---------- Estado ----------
  const S = {
    vw: 0, vh: 0, navH: 64, docH: 0, max: 1,
    railTop: 0, railH: 0,
    enabled: false, built: false,
    sections: [],
    ticks: [],
    lastY: -1, v: 0, lastT: performance.now(),
    current: -1,
    anim: null,        // salto o ajuste en curso
    drag: null,
    snapTimer: 0,
    stretched: new Set(),
    force: true,
  };

  // ---------- Construcción del DOM ----------
  const el = (tag, cls, parent) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  };

  const poolTop = el('div', 'ruler-pool top', root);
  const poolBot = el('div', 'ruler-pool bottom', root);
  const words = el('div', 'ruler-words', root);
  const rail = el('div', 'ruler-rail', root);
  const bracket = el('div', 'ruler-bracket', rail);
  const ghost = el('div', 'ruler-ghost', rail);
  const tickLayer = el('div', '', rail);
  const markLayer = el('div', '', rail);
  const needle = el('div', 'ruler-needle', rail);
  const readout = el('span', 'ruler-readout', needle);

  for (let p = 0; p <= 100; p++) {
    const major = p % CFG.majorEvery === 0;
    const t = el('div', 'ruler-tick ' + (major ? 'major' : 'minor'), tickLayer);
    t.style.setProperty('--d', (p * CFG.introStagger).toFixed(3) + 's');
    let num = null;
    if (p % CFG.labelEvery === 0) {
      num = el('span', 'ruler-num', tickLayer);
      num.textContent = p;
      num.style.setProperty('--d', (p * CFG.introStagger).toFixed(3) + 's');
    }
    S.ticks.push({ el: t, num, p, y: 0, scale: 1 });
  }
  root.style.setProperty('--intro-dur', CFG.introDur + 's');

  function collectSections() {
    const nodes = Array.from(document.querySelectorAll('[data-section][data-label]'));
    words.textContent = '';
    markLayer.textContent = '';
    S.sections = nodes.map((node, i) => {
      const label = node.dataset.label;
      const ink = node.dataset.ink || 'var(--accent-ink)';
      const group = el('div', 'ruler-word', words);
      group.dataset.i = i;
      group.style.setProperty('--ink', ink);
      const letters = Array.from(label).map((ch) => {
        const s = el('span', 'ruler-letter', group);
        s.textContent = ch;
        s.dataset.i = i;
        return { el: s, ch, adv: 0, tf: '', col: '', op: '' };
      });
      const mark = el('div', 'ruler-mark', markLayer);
      mark.style.setProperty('--mk', ink);
      const mapLabel = el('span', 'ruler-maplabel', markLayer);
      mapLabel.textContent = node.dataset.label;
      mapLabel.style.setProperty('--mk', ink);
      mapLabel.dataset.i = i;
      return { node, i, label, letters, cum: [], W: 0, top: 0, mark, mapLabel };
    });
  }

  // Mide el avance de cada letra a 100 px (el tamaño base de .ruler-letter)
  function measure() {
    // se mide fuera de .ruler: con la regla oculta (display:none) los anchos darían 0
    const probe = el('span', 'ruler-letter ruler-measure', document.body);
    for (const s of S.sections) {
      let acc = 0;
      s.cum = [];
      for (const L of s.letters) {
        probe.textContent = L.ch;
        L.adv = probe.getBoundingClientRect().width;
        s.cum.push(acc);
        acc += L.adv;
      }
      s.W = acc;
    }
    probe.remove();
  }

  function layout() {
    S.vw = document.documentElement.clientWidth;
    S.vh = window.innerHeight;
    const nav = document.getElementById('nav');
    S.navH = nav ? nav.getBoundingClientRect().height : 64;
    S.docH = document.documentElement.scrollHeight;
    S.max = Math.max(1, S.docH - S.vh);
    S.railTop = CFG.edgePad;                      // la regla empieza bajo la nav (top: var(--nav-h))
    S.railH = S.vh - S.navH - CFG.edgePad * 2;
    const y = window.scrollY;
    for (const s of S.sections) s.top = s.node.getBoundingClientRect().top + y;

    for (const t of S.ticks) {
      t.y = S.railTop + (t.p / 100) * S.railH;
      t.el.style.top = t.y + 'px';
      if (t.num) t.num.style.top = t.y + 'px';
    }
    for (const s of S.sections) {
      const ry = railYForScroll(targetFor(s.i));
      s.mark.style.top = ry - 1 + 'px';
      s.mapLabel.style.top = ry + 'px';
    }
    const was = S.enabled;
    S.enabled = S.vw >= CFG.minWidth;
    root.classList.toggle('is-on', S.enabled);
    if (S.enabled && !was) intro();
    S.force = true;
  }

  // ---------- Geometría ----------
  const flipEnd = () => S.navH + S.vh * CFG.flipLine;
  const flipStart = () => flipEnd() + CFG.flipZone;
  const textRight = () => S.vw - CFG.railW - CFG.textPad;
  const targetFor = (i) => clamp(S.sections[i].top - S.navH, 0, S.max);  // scroll donde la sección queda actual
  const railYForScroll = (sy) => S.railTop + clamp(sy / S.max) * S.railH;

  // Posición por letra: {x, y, r, f}. Las letras usan transform-origin 0 0.
  function horiz(s, Y, px) {
    const f = px / 100, x0 = textRight() - s.W * f;
    return (k) => ({ x: x0 + s.cum[k] * f, y: Y, r: 0, f });
  }
  function vert(s, Ytop, px) {
    // rotate(-90deg): la palabra se lee de abajo arriba; la primera letra queda abajo
    const f = px / 100, X = textRight() - px, Yb = Ytop + s.W * f;
    return (k) => ({ x: X, y: Yb - s.cum[k] * f, r: -90, f });
  }
  const pileY = (i) => S.navH + CFG.topPad + i * CFG.slot;
  const currentY = (i) => pileY(i) + CFG.currentGap;
  const queueY = (i) => S.vh - CFG.queuePad - CFG.queuePx - (S.sections.length - 1 - i) * CFG.slot;

  // Estilo de cada estado: [opacidad, % de color propio]
  const LOOK = {
    queue: [CFG.queueAlpha, 0],
    riding: [CFG.ridingAlpha, 35],
    current: [1, 100],
    pile: [CFG.queueAlpha, 0],
  };

  // ---------- Pintado de una sección ----------
  function paintSection(s, sy) {
    const n = s.letters.length;
    const secTop = s.top - sy;
    const next = S.sections[s.i + 1];
    const tD = clamp((S.vh - secTop) / CFG.detachZone);
    const tF = clamp((flipStart() - secTop) / CFG.flipZone);
    const tP = next ? clamp((flipStart() - (next.top - sy)) / CFG.flipZone) : 0;

    let A, B, t, la, lb, stag, arc, reverse;
    if (tP > 0) {
      A = horiz(s, currentY(s.i), CFG.headingPx); B = horiz(s, pileY(s.i), CFG.queuePx);
      la = LOOK.current; lb = LOOK.pile; t = tP; stag = 0; arc = 0;
    } else if (tF > 0) {
      A = vert(s, secTop + 8, CFG.ridingPx); B = horiz(s, currentY(s.i), CFG.headingPx);
      la = LOOK.riding; lb = LOOK.current; t = tF; stag = CFG.stagger; arc = CFG.arc; reverse = true;
    } else {
      A = horiz(s, queueY(s.i), CFG.queuePx); B = vert(s, secTop + 8, CFG.ridingPx);
      la = LOOK.queue; lb = LOOK.riding; t = tD; stag = CFG.stagger * 0.4; arc = CFG.arc * 0.5;
    }
    if (reduce) { stag = 0; arc = 0; }

    for (let k = 0; k < n; k++) {
      const L = s.letters[k];
      // en el giro llegan primero las últimas letras (las que en vertical están más arriba)
      const order = reverse ? n - 1 - k : k;
      const start = n > 1 ? stag * (order / (n - 1)) : 0;
      const lt = ease(clamp((t - start) / (1 - stag || 1)));
      const a = A(k), b = B(k);
      const bow = arc * Math.sin(Math.PI * lt);
      const x = lerp(a.x, b.x, lt) - bow;
      const y = lerp(a.y, b.y, lt);
      const r = lerp(a.r, b.r, lt);
      const f = lerp(a.f, b.f, lt);
      const tf = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${f.toFixed(4)})`;
      if (tf !== L.tf) { L.el.style.transform = tf; L.tf = tf; }
      const op = lerp(la[0], lb[0], lt).toFixed(2);
      if (op !== L.op) { L.el.style.opacity = op; L.op = op; }
      const mix = Math.round(lerp(la[1], lb[1], lt));
      const col = `color-mix(in oklab, var(--ink) ${mix}%, var(--faint))`;
      if (col !== L.col) { L.el.style.color = col; L.col = col; }
    }
    return tF >= 1 && tP < 1;   // ¿es la sección actual?
  }

  // ---------- Bucle ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.max(1, now - S.lastT);
    S.lastT = now;

    stepAnim(now);

    const sy = window.scrollY;
    const dy = sy - (S.lastY < 0 ? sy : S.lastY);
    S.v = lerp(S.v, dy / dt, 0.25);
    if (Math.abs(S.v) < 0.002) S.v = 0;
    const moved = sy !== S.lastY;
    S.lastY = sy;

    const p = clamp(sy / S.max);
    if (!S.enabled) {
      if (moved || S.force) paintMini(sy, p);
      S.force = false;
      return;
    }
    if (!moved && !S.force && S.v === 0 && S.stretched.size === 0) return;
    S.force = false;

    let cur = 0;
    for (const s of S.sections) if (paintSection(s, sy)) cur = s.i;
    if (cur !== S.current) {
      S.current = cur;
      document.dispatchEvent(new CustomEvent('ruler:section', { detail: { index: cur, label: S.sections[cur].node.dataset.label } }));
    }

    // aguja y lectura
    const ny = railYForScroll(sy);
    needle.style.transform = `translateY(${ny.toFixed(1)}px)`;
    needle.style.opacity = clamp((p * 100) / CFG.needleFadePct).toFixed(2);
    readout.textContent = Math.round(p * 100);
    // los números de la regla se apartan de la lectura de la aguja
    for (const t of S.ticks) {
      if (!t.num) continue;
      const op = Math.abs(t.y - ny) < 22 ? '0' : '';
      if (t.num.style.opacity !== op) t.num.style.opacity = op;
    }

    // tramo visible (sólo se ve con el mapa abierto)
    const by = railYForScroll(clamp(sy, 0, S.max));
    const be = railYForScroll(clamp(sy + S.vh - S.navH, 0, S.max));
    bracket.style.top = by + 'px';
    bracket.style.height = Math.max(4, be - by) + 'px';

    // las marcas cercanas a la aguja se estiran con la velocidad
    const speed = reduce ? 0 : clamp(Math.abs(S.v) / 2.5);
    const nextStretched = new Set();
    for (const t of S.ticks) {
      const d = Math.abs(t.y - ny);
      let sc = 1;
      if (speed > 0 && d < CFG.velRadius) {
        const k = 1 - d / CFG.velRadius;
        sc = 1 + CFG.velMax * 2 * speed * k * k;
      }
      if (sc !== 1) nextStretched.add(t);
      if (Math.abs(sc - t.scale) > 0.01 || (sc === 1 && t.scale !== 1)) {
        t.el.style.transform = sc === 1 ? '' : `scaleX(${sc.toFixed(3)})`;
        t.scale = sc;
      }
    }
    S.stretched = nextStretched;

    // fondos de contraste detrás de la pila y de la cola
    poolTop.style.height = (CFG.topPad + cur * CFG.slot + CFG.currentGap + CFG.headingPx + 56) + 'px';
    const queued = S.sections.filter((s) => s.top - sy > S.vh - 2).length;
    poolBot.style.height = queued ? (queued * CFG.slot + CFG.queuePad + 48) + 'px' : '0px';

    if (moved) scheduleSnap();
  }

  // ---------- Indicador compacto ----------
  let miniIdx = -1;
  function paintMini(sy, p) {
    if (!mini) return;
    mini.classList.toggle('show', sy > 40);
    const fill = document.getElementById('mini-ruler-fill');
    if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
    let idx = 0;
    const line = S.navH + 34 + 48;
    for (const s of S.sections) if (s.top - sy <= line) idx = s.i;
    if (idx !== miniIdx) {
      miniIdx = idx;
      const s = S.sections[idx];
      document.getElementById('mini-ruler-label').textContent = s.node.dataset.label;
      mini.style.setProperty('--mini-ink', s.node.dataset.ink || 'var(--accent-ink)');
    }
  }

  // ---------- Desplazamientos animados (saltos y ajuste) ----------
  function animateTo(target, dur) {
    target = clamp(Math.round(target), 0, S.max);
    const from = window.scrollY;
    if (Math.abs(target - from) < 1) return;
    if (reduce || dur <= 0) { window.scrollTo(0, target); return; }
    // con scroll suave activo, el salto lo hace Lenis para no pelear con su inercia
    const lenis = window.creinnovaLenis;
    if (lenis) { lenis.scrollTo(target, { duration: dur, easing: ease, force: true }); return; }
    S.anim = { from, to: target, t0: performance.now(), dur: dur * 1000 };
  }
  function stepAnim(now) {
    if (S.drag && S.drag.active) {
      if (window.creinnovaLenis) { window.creinnovaLenis.scrollTo(S.drag.target, { lerp: CFG.dragLerp, force: true }); return; }
      const y = window.scrollY;
      const ny = lerp(y, S.drag.target, CFG.dragLerp);
      if (Math.abs(ny - y) > 0.5) window.scrollTo(0, ny);
      return;
    }
    if (!S.anim) return;
    const a = S.anim;
    const t = clamp((now - a.t0) / a.dur);
    window.scrollTo(0, lerp(a.from, a.to, ease(t)));
    if (t >= 1) S.anim = null;
  }
  const cancelAnim = () => { S.anim = null; clearTimeout(S.snapTimer); };
  ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, cancelAnim, { passive: true }));

  function jumpToSection(i) {
    const s = S.sections[i];
    if (!s) return;
    const target = s.top - S.navH;
    const dist = Math.abs(target - window.scrollY);
    animateTo(target, Math.min(CFG.jumpMax, 0.5 + dist / 2500));
  }

  // Si el usuario se detiene con un giro a medias, lo completa hacia el lado más cercano
  function scheduleSnap() {
    clearTimeout(S.snapTimer);
    if (S.anim || (S.drag && S.drag.active)) return;
    S.snapTimer = setTimeout(() => {
      if (S.anim || !S.enabled) return;
      const sy = window.scrollY;
      for (const s of S.sections) {
        const tF = clamp((flipStart() - (s.top - sy)) / CFG.flipZone);
        if (tF > 0.03 && tF < 0.97) {
          const secTarget = tF < 0.5 ? flipStart() : flipEnd() - 1;
          const target = s.top - secTarget;
          if (target >= 0 && target <= S.max) animateTo(target, CFG.snapDur);
          return;
        }
      }
    }, CFG.snapDelay);
  }

  // ---------- Interacción con la regla ----------
  let mapTimer = 0;
  rail.addEventListener('pointerenter', () => {
    clearTimeout(mapTimer);
    mapTimer = setTimeout(() => root.classList.add('is-map'), CFG.mapDelay);
  });
  rail.addEventListener('pointerleave', () => {
    clearTimeout(mapTimer);
    if (S.drag && S.drag.active) return;
    mapTimer = setTimeout(() => root.classList.remove('is-map'), CFG.mapDelay);
  });
  const fracAt = (clientY) => clamp((clientY - S.navH - S.railTop) / S.railH);
  rail.addEventListener('pointermove', (e) => {
    ghost.style.top = (e.clientY - S.navH) + 'px';
    if (S.drag && S.drag.active) {
      if (Math.abs(e.clientY - S.drag.y0) > 4) S.drag.moved = true;
      S.drag.target = fracAt(e.clientY) * S.max;
    }
  });
  rail.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const label = e.target.closest('.ruler-maplabel');
    if (label) { jumpToSection(+label.dataset.i); return; }
    cancelAnim();
    rail.setPointerCapture(e.pointerId);
    S.drag = { active: true, y0: e.clientY, moved: false, target: window.scrollY };
  });
  const endDrag = (e) => {
    if (!S.drag || !S.drag.active) return;
    const wasClick = !S.drag.moved;
    S.drag.active = false;
    if (wasClick) {
      const target = fracAt(e.clientY) * S.max;
      animateTo(target, Math.min(CFG.jumpMax, 0.5 + Math.abs(target - window.scrollY) / 2500));
    }
    if (!rail.matches(':hover')) root.classList.remove('is-map');
  };
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);

  words.addEventListener('click', (e) => {
    const t = e.target.closest('[data-i]');
    if (t) jumpToSection(+t.dataset.i);
  });

  // ---------- Entrada: las marcas se dibujan en cascada de arriba abajo ----------
  function intro() {
    if (reduce) { root.classList.add('is-live'); return; }
    root.classList.remove('is-live');
    root.classList.add('ruler-intro');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('ruler-intro')));
    setTimeout(() => root.classList.add('is-live'), (CFG.introDur + 101 * CFG.introStagger) * 1000 + 50);
  }

  // ---------- Arranque ----------
  function start() {
    collectSections();
    measure();
    layout();
    S.built = true;
    requestAnimationFrame(frame);
    let rt = 0;
    const relayout = () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(layout); };
    window.addEventListener('resize', relayout);
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.body);
    document.fonts?.addEventListener?.('loadingdone', () => { measure(); relayout(); });
  }

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  // no esperamos más de 1,5 s a las fuentes: si tardan, se vuelve a medir al cargar
  Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(start);

  window.CreinnovaRuler = {
    jumpToSection,
    jumpToId(id) {
      const s = S.sections.find((x) => x.node.id === id);
      if (s) { jumpToSection(s.i); return true; }
      return false;
    },
    config: CFG,
  };
})();
