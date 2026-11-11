/* ==========================================================================
   Sigma Analist — revelados, intro, índice, visor de figuras y anclas
   Los revelados replican la coreografía de getartcraft.com (GSAP + ScrollTrigger):
     [data-choreo]       línea superior que se dibuja + puntos de esquina + rótulo
     [data-reveal]       sube 28 px y pasa de desenfocado a nítido
     [data-reveal-group] sus hijos entran en ola de izquierda a derecha
   Añadidos de la revisión de animejs.com, con el mismo idioma visual:
     [data-split]        el titular se parte por caracteres (con copia .sr-only)
     [data-words]        los títulos entran palabra a palabra
     .stat b             las cifras cuentan hasta su valor real
     .flow-step          los pasos del método se activan en orden al hacer scroll
     [data-tech-stage]   escenarios ilustrados que se fijan con un clic (isla «Ver más»)
     [data-mae]          barras del MAE con pestañas y orden (estilo tweakcn)
   Todo lo nuevo respeta prefers-reduced-motion: sin movimiento, nada se parte.
   ========================================================================== */
(function () {
  'use strict';

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = reduceMQ.matches;
  reduceMQ.addEventListener?.('change', (e) => { reduce = e.matches; });

  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) document.documentElement.classList.remove('js');

  // ---------- Texto partido ----------
  // Los caracteres quedan aria-hidden y el texto legible se conserva en .sr-only.
  function splitChars(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          // cada palabra va en un .wd sin cortes: entre letras inline-block el navegador puede partir la línea
          const frag = document.createDocumentFragment();
          child.textContent.replace(/\s+/g, ' ').split(/( )/).forEach((part) => {
            if (!part) return;
            if (part === ' ') { frag.append(' '); return; }
            const wd = document.createElement('span');
            wd.className = 'wd';
            Array.from(part).forEach((ch) => {
              const span = document.createElement('span');
              span.className = 'ch';
              span.setAttribute('aria-hidden', 'true');
              span.textContent = ch;
              wd.append(span);
            });
            frag.append(wd);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          child.setAttribute('aria-hidden', 'true');
          walk(child);
        }
      });
    };
    walk(el);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    el.append(sr);
    return el.querySelectorAll('.ch');
  }

  // Las palabras no necesitan copia accesible: el texto del DOM no cambia.
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent;
          const lead = /^\s/.test(text);
          const trail = /\s$/.test(text);
          const words = text.trim().split(/\s+/).filter(Boolean);
          if (!words.length) return;
          const frag = document.createDocumentFragment();
          if (lead) frag.append(' ');
          words.forEach((w, i) => {
            if (i) frag.append(' ');
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            frag.append(span);
          });
          if (trail) frag.append(' ');
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    return el.querySelectorAll('.word');
  }

  // ---------- Revelados ----------
  if (hasGsap) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // nunca 'all': borraría también las variables CSS en línea (--c, --ci) de cada sección
    const CLEAR = 'opacity,visibility,transform,filter';
    const FROM = { autoAlpha: 0, y: 24, filter: 'blur(6px)' };
    const TO = { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', overwrite: true, clearProps: CLEAR };

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Intro del hero: el titular entra letra a letra, el resto en cascada
      const title = document.querySelector('[data-split]');
      const chars = title ? splitChars(title) : [];
      const intro = gsap.utils.toArray('[data-intro]').filter((node) => node !== title);

      gsap.set(intro, FROM);
      if (chars.length) gsap.set(chars, { autoAlpha: 0, y: 20, filter: 'blur(6px)' });
      document.documentElement.classList.add('intro-done');

      const tl = gsap.timeline({ delay: 0.15 });
      tl.to(intro, { ...TO, stagger: 0.09 });
      if (chars.length) {
        tl.to(chars, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.75, ease: 'power3.out', stagger: 0.016, clearProps: CLEAR }, 0.05);
      }
      tl.from('.process-steps li', { autoAlpha: 0, x: -12, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: CLEAR }, 0.55);

      gsap.utils.toArray('[data-choreo]').forEach((section) => {
        const rule = section.querySelector('[data-draw-rule]');
        const ticks = section.querySelectorAll('[data-draw-tick]');
        const eyebrow = section.querySelector('[data-draw-eyebrow]');
        if (rule) gsap.set(rule, { scaleX: 0 });
        if (ticks.length) gsap.set(ticks, { scale: 0, opacity: 0 });
        if (eyebrow) gsap.set(eyebrow, FROM);
        ScrollTrigger.create({
          trigger: section,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            const t = gsap.timeline();
            if (rule) t.to(rule, { scaleX: 1, duration: 0.7, ease: 'power2.out', clearProps: CLEAR }, 0);
            if (eyebrow) t.to(eyebrow, { ...TO }, 0.15);
            if (ticks.length) t.to(ticks, { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out', stagger: 0.06, clearProps: CLEAR }, 0.35);
          },
        });
      });

      gsap.utils.toArray('[data-reveal]:not([data-reveal-group] [data-reveal]):not([data-words])').forEach((node) => {
        gsap.set(node, FROM);
        ScrollTrigger.create({ trigger: node, start: 'top 85%', once: true, onEnter: () => gsap.to(node, TO) });
      });

      // Títulos palabra a palabra: el bloque no se anima, se animan sus palabras
      gsap.utils.toArray('[data-words]').forEach((node) => {
        const words = splitWords(node);
        if (!words.length) return;
        gsap.set(words, FROM);
        ScrollTrigger.create({ trigger: node, start: 'top 85%', once: true, onEnter: () => gsap.to(words, { ...TO, stagger: 0.045 }) });
      });

      gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
        const items = Array.from(group.querySelectorAll('[data-reveal]'));
        if (!items.length) return;
        gsap.set(items, FROM);
        const box = group.getBoundingClientRect();
        items.forEach((item) => {
          // retraso proporcional a la posición horizontal: la fila entra como una ola
          const delay = box.width > 0 ? ((item.getBoundingClientRect().left - box.left) / box.width) * 0.18 : 0;
          ScrollTrigger.create({ trigger: item, start: 'top 88%', once: true, onEnter: () => gsap.to(item, { ...TO, delay }) });
        });
      });

      // Cifras: cuentan hasta su valor real y terminan con el texto original exacto
      gsap.utils.toArray('.stat b').forEach((el) => {
        const raw = el.textContent;
        const parts = raw.match(/^(\D*?)(\d[\d\s.,]*)(\D*)$/);
        if (!parts) return;
        const [, prefix, numWithTail, tailSuffix] = parts;
        const tail = (numWithTail.match(/[\s\u00A0\u202F]+$/) || [''])[0];
        const numRaw = numWithTail.trim();
        const suffix = tail + tailSuffix;
        const plain = numRaw.replace(/[\s\u00A0\u202F]/g, '');
        const [intPart, decPart] = plain.split(/[.,]/);
        const value = Number(intPart + (decPart ? '.' + decPart : ''));
        if (!Number.isFinite(value)) return;
        const decimals = decPart ? decPart.length : 0;
        const sep = (numRaw.match(/\d([\s\u00A0\u202F])\d/) || [])[1] || ' ';
        const fmt = (v) => {
          const [i, d] = v.toFixed(decimals).replace('.', ',').split(',');
          return i.replace(/\B(?=(\d{3})+(?!\d))/g, sep) + (d ? ',' + d : '');
        };
        const state = { v: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => gsap.to(state, {
            v: value,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = prefix + fmt(state.v) + suffix; },
            onComplete: () => { el.textContent = raw; },
          }),
        });
      });

      // Método: los tres bloques se activan en orden conforme la sección recorre la pantalla
      const flow = document.querySelector('#metodo .flow');
      if (flow) {
        const steps = Array.from(flow.querySelectorAll('.flow-step'));
        ScrollTrigger.create({
          trigger: flow,
          start: 'top 82%',
          end: 'bottom 58%',
          onUpdate: (self) => {
            const p = self.progress * steps.length;
            steps.forEach((step, i) => step.classList.toggle('is-active', p >= i + 0.15));
          },
          onLeave: () => steps.forEach((step) => step.classList.add('is-active')),
          onLeaveBack: () => steps.forEach((step) => step.classList.remove('is-active')),
        });
      }

      // Barras del MAE: crecen con el scroll y quedan llenas antes de la mitad de la pantalla.
      // El progreso pasa por quickTo para que la rueda del ratón no las haga avanzar a saltos.
      const bars = document.querySelector('.bars');
      if (bars) {
        const fill = { p: 0 };
        const paint = () => bars.style.setProperty('--p', fill.p.toFixed(3));
        const toP = gsap.quickTo(fill, 'p', { duration: 0.45, ease: 'power3.out', onUpdate: paint });
        paint();
        ScrollTrigger.create({
          trigger: bars, start: 'top 92%', end: 'top 58%',
          onUpdate: (self) => toP(self.progress),
          onLeave: () => toP(1),
          onLeaveBack: () => toP(0),
        });
      }

      // Onda de puntos 13x13: entran desde el centro y se desparraman al aparecer
      const wave = document.querySelector('[data-dot-wave]');
      if (wave) {
        const COLS = 13, ROWS = 13;
        const frag = document.createDocumentFragment();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const dot = document.createElement('span');
            dot.style.left = (c / (COLS - 1) * 100) + '%';
            dot.style.top = (r / (ROWS - 1) * 100) + '%';
            frag.append(dot);
          }
        }
        wave.append(frag);
        const dots = wave.querySelectorAll('span');
        const rnd = gsap.utils.random;
        gsap.set(dots, { opacity: 0, scale: 0.4, x: () => rnd(-70, 70), y: () => rnd(-70, 70) });
        ScrollTrigger.create({
          trigger: wave.closest('section'), start: 'top 72%', once: true,
          // 169 puntos: con 0,007 s entre cada uno la onda completa dura ~1,3 s en vez de ~3,6 s
          onEnter: () => gsap.to(dots, {
            opacity: 1, scale: 1, x: 0, y: 0,
            duration: 0.8, ease: 'power3.out',
            stagger: { each: 0.007, grid: [ROWS, COLS], from: 'center' },
          }),
        });
      }

      return () => {};
    });

    // Las alturas cambian al cargar fuentes; recalcula los disparadores
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }

  // ---------- Anclas internas (saltos coherentes con la regla) ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length <= 1) return;
    const id = a.getAttribute('href').slice(1);
    const isSection = window.CreinnovaRuler && window.CreinnovaRuler.jumpToId(id);
    // las anclas que no son secciones (p. ej. «Saltar al contenido») también pasan por Lenis
    const target = isSection ? null : document.getElementById(id);
    if (!isSection && !target) return;
    e.preventDefault();
    if (target && window.creinnovaLenis) window.creinnovaLenis.scrollTo(target, { offset: -64, duration: 1, force: true });
    else if (target) target.scrollIntoView();
    // el foco acompaña al destino: sin esto el enlace de salto no salta nada con teclado
    if (target && !isSection) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    history.replaceState(null, '', '#' + id);
  });

  // ---------- Índice de secciones ----------
  const navIndex = document.getElementById('nav-index');
  const indexPanel = document.getElementById('indice');
  const indexLinks = indexPanel ? Array.from(indexPanel.querySelectorAll('a')) : [];

  function openIndex() {
    if (!navIndex || !indexPanel) return;
    indexPanel.hidden = false;
    navIndex.setAttribute('aria-expanded', 'true');
    navIndex.setAttribute('aria-label', 'Cerrar índice de secciones');
    indexLinks[0]?.focus();
  }
  function closeIndex(returnFocus) {
    if (!navIndex || !indexPanel) return;
    indexPanel.hidden = true;
    navIndex.setAttribute('aria-expanded', 'false');
    navIndex.setAttribute('aria-label', 'Índice de secciones');
    if (returnFocus) navIndex.focus({ preventScroll: true });
  }

  navIndex?.addEventListener('click', () => {
    if (indexPanel.hidden) openIndex(); else closeIndex(true);
  });
  document.addEventListener('click', (e) => {
    if (!indexPanel || indexPanel.hidden) return;
    if (e.target.closest('#indice')) { closeIndex(false); return; }
    if (!e.target.closest('#nav-index')) closeIndex(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && indexPanel && !indexPanel.hidden) closeIndex(true);
  });

  // Sección visible → aria-current en la nav y en el índice
  const sectionNodes = Array.from(document.querySelectorAll('[data-section]'));
  const sectionLinks = Array.from(document.querySelectorAll('.nav-links a, .index-panel a'));
  let currentId = '';
  let currentRaf = 0;
  function paintCurrent() {
    let id = sectionNodes.length ? sectionNodes[0].id : '';
    for (const node of sectionNodes) if (node.getBoundingClientRect().top <= 96) id = node.id;
    if (id === currentId) return;
    currentId = id;
    sectionLinks.forEach((a) => {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', () => {
    if (currentRaf) return;
    currentRaf = requestAnimationFrame(() => { currentRaf = 0; paintCurrent(); });
  }, { passive: true });
  paintCurrent();

  // ---------- Escenarios ilustrados (7 técnicas del hero y recreaciones del método) ----------
  // Cada [data-tech-stage] declara sus disparadores (data-items) y la clase que marca el actual
  // (data-current). Señalar o enfocar un disparador muestra su panel; sin interacción el
  // escenario pasa solo cada DUR segundos. Con movimiento reducido no hay pase ni trazos.
  const STAGE_DUR = 4.5;
  function initStage(stage) {
    const items = Array.from(document.querySelectorAll(stage.dataset.items || ''));
    const panels = Array.from(stage.querySelectorAll('[data-tech-panel]'));
    const cls = stage.dataset.current || 'is-active';
    const host = stage.closest('.process-card, .stage-body') || stage;
    if (!items.length || !panels.length) return;
    // las recreaciones del método tardan más en contarse que una técnica
    const dur = stage.classList.contains('is-wide') ? STAGE_DUR * 1.6 : STAGE_DUR;
    stage.style.setProperty('--tech-dur', dur + 's');
    let active = -1, pinned = -1, timer = 0, hold = false, offscreen = false, loops = [];

    function draw(panel) {
      const { gsap } = window;
      // no todas las ilustraciones tienen todas las piezas: GSAP avisa si el objetivo está vacío
      const play = (sel, from, to) => { const n = panel.querySelectorAll(sel); if (n.length) gsap.fromTo(n, from, { ...to, overwrite: true }); };
      loops.forEach((t) => t.kill()); loops = [];
      play('.d', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.08 });
      play('.k', { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.6)', stagger: 0.06 });
      play('.nd', { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.12 });
      play('.seg', { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power3.out', stagger: 0.15 });
      play('.b', { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: 'power3.out', stagger: 0.035, delay: 0.15 });
      play('.p', { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(2)', stagger: 0.05, delay: 0.25 });
      play('.tech-copy', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'opacity,visibility,transform' });

      // la ventana de la CNN recorre la serie de punta a punta (176 = 230 - 10 - 44 del viewBox)
      const win = panel.querySelector('.win');
      if (win) loops.push(gsap.fromTo(win, { x: 0 }, { x: 176, duration: 2.2, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.5 }));

      // fichas que recorren su ruta, como el trazado animado de archify
      panel.querySelectorAll('.tr').forEach((dot) => {
        const route = panel.querySelector('#' + dot.dataset.route);
        if (!route) return;
        const len = route.getTotalLength();
        const s = { t: 0 };
        const place = () => { const pt = route.getPointAtLength(s.t * len); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); };
        place();
        loops.push(gsap.fromTo(s, { t: 0 }, { t: 1, duration: +dot.dataset.dur || 3, ease: 'power1.inOut', repeat: -1, repeatDelay: 0.4, delay: 0.8, onUpdate: place }));
      });

      // factorial 4×5×3: la rejilla se recorre una vez por réplica y termina en la campeona
      const cells = panel.querySelectorAll('.cell');
      const reps = panel.querySelectorAll('.rep');
      if (cells.length) {
        const champ = panel.querySelector('.cell.champ');
        const clear = () => cells.forEach((c) => c.classList.remove('on'));
        clear(); champ?.classList.remove('won');
        reps.forEach((rep) => rep.classList.remove('on'));
        const tl = gsap.timeline({ delay: 0.5 });
        const pass = cells.length * 0.035;
        const rounds = Math.max(reps.length, 1);
        for (let r = 0; r < rounds; r++) {
          const t0 = r * (pass + 0.35);
          cells.forEach((c, i) => tl.call(() => c.classList.add('on'), null, t0 + i * 0.035));
          tl.call(() => reps[r]?.classList.add('on'), null, t0 + pass);
          if (r < rounds - 1) tl.call(clear, null, t0 + pass + 0.25);
        }
        tl.call(() => champ?.classList.add('won'), null, '+=0.2');
        loops.push(tl);
      }

      // curvas de la prueba: un barrido de izquierda a derecha con su cursor
      const sweep = panel.querySelector('.sweep');
      if (sweep) {
        const cursor = panel.querySelector('.cursor');
        const s = { w: 0 };
        const paint = () => { sweep.setAttribute('width', s.w); if (cursor) cursor.setAttribute('transform', `translate(${Math.min(s.w, 352)} 0)`); };
        paint();
        loops.push(gsap.to(s, { w: 360, duration: 2.6, ease: 'power1.inOut', delay: 0.3, onUpdate: paint, onComplete: () => cursor && gsap.to(cursor, { opacity: 0, duration: 0.3 }) }));
        if (cursor) gsap.set(cursor, { opacity: 1 });
      }
    }

    function restartTimer() {
      clearTimeout(timer);
      stage.classList.remove('is-cycling');
      if (active < 0 || pinned >= 0 || reduce || hold || offscreen) return;
      void stage.offsetWidth; // reinicia la animación CSS de la barra de tiempo
      stage.classList.add('is-cycling');
      timer = setTimeout(() => setActive((active + 1) % panels.length), dur * 1000);
    }

    function setActive(i) {
      if (i === active || !panels[i]) return;
      active = i;
      items.forEach((el, j) => el.classList.toggle(cls, j === i));
      panels.forEach((panel, j) => { panel.hidden = j !== i; });
      stage.style.setProperty('--tc', getComputedStyle(panels[i]).getPropertyValue('--c').trim() || 'var(--c)');
      if (hasGsap && !reduce) draw(panels[i]);
      restartTimer();
    }

    // Fijar: el clic deja el panel quieto (sin pase automático) y, si el panel trae figura del
    // paper, muestra la isla «Ver más», que es la que abre el visor. Otro clic en el mismo lo suelta.
    const island = stage.querySelector('[data-island]');
    function setPinned(i) {
      pinned = i;
      items.forEach((el, j) => el.setAttribute('aria-pressed', String(j === i)));
      stage.classList.toggle('is-pinned', i >= 0);
      if (island) {
        const fig = i >= 0 ? panels[i].dataset.fig : '';
        if (fig) {
          island.setAttribute('data-figure', fig);
          island.setAttribute('data-caption', panels[i].dataset.cap || '');
          const wasHidden = island.hidden;
          island.hidden = false;
          if (wasHidden && hasGsap && !reduce) window.gsap.fromTo(island, { autoAlpha: 0, y: 10, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)', clearProps: 'opacity,visibility,transform' });
        } else {
          island.hidden = true;
          island.removeAttribute('data-figure');
        }
      }
      restartTimer();
    }

    items.forEach((el, i) => {
      // mientras hay un panel fijado, pasar por encima de otro no lo cambia
      el.addEventListener('pointerenter', () => { if (pinned < 0) setActive(i); });
      el.addEventListener('focusin', () => { if (pinned < 0) setActive(i); });
      el.addEventListener('click', () => {
        if (pinned === i) { setPinned(-1); return; }
        setActive(i);
        setPinned(i);
      });
    });
    const pause = (on) => { hold = on; restartTimer(); };
    host.addEventListener('pointerenter', () => pause(true));
    host.addEventListener('pointerleave', () => pause(false));
    host.addEventListener('focusin', () => pause(true));
    host.addEventListener('focusout', (e) => { if (!host.contains(e.relatedTarget)) pause(false); });
    document.addEventListener('visibilitychange', () => { offscreen = document.hidden; restartTimer(); });

    // el primer panel se dibuja cuando el escenario entra en pantalla, no antes
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        offscreen = !entry.isIntersecting;
        if (entry.isIntersecting && active < 0) setTimeout(() => { if (active < 0) setActive(0); }, hasGsap && !reduce ? 600 : 0);
        else restartTimer();
      }, { threshold: 0.25 }).observe(stage);
    } else {
      setActive(0);
    }
  }
  document.querySelectorAll('[data-tech-stage]').forEach(initStage);

  // ---------- Barras del MAE (Resultados) ----------
  // Pestañas Prueba / Entrenamiento / Comparar y orden por error. Las barras ya vienen dibujadas
  // en el HTML: sin JS se ve la vista de prueba completa.
  const mae = document.querySelector('[data-mae]');
  if (mae) {
    const list = mae.querySelector('.mae-list');
    const rows = Array.from(list.children);
    const insight = mae.querySelector('[data-mae-insight]');
    const sortBtn = mae.querySelector('[data-sort]');
    const modeBtns = Array.from(mae.querySelectorAll('.segmented [data-mode]'));
    const INSIGHT = {
      test: 'XGBoost: 4,22 en prueba, un 34 % menos que la mejor referencia (6,40).',
      train: 'XGBoost: 3,52 en entrenamiento, el error más bajo de todos; en prueba sube a 4,22.',
      both: 'Redes y modelos de conteo apenas cambian de entrenamiento a prueba; XGBoost sube 0,70 y la media móvil, 0,36.',
    };
    let sorted = false;
    // FLIP: se mide dónde estaba cada fila, se reordena y se anima desde la posición vieja
    function order() {
      const key = mae.dataset.mode === 'train' ? 'train' : 'test';
      const target = sorted ? rows.slice().sort((a, b) => +a.dataset[key] - +b.dataset[key]) : rows;
      const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
      target.forEach((r) => list.append(r));
      if (reduce || typeof Element.prototype.animate !== 'function') return;
      rows.forEach((r) => {
        const dy = before.get(r) - r.getBoundingClientRect().top;
        if (dy) r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.16, 1, .3, 1)' });
      });
    }
    modeBtns.forEach((btn) => btn.addEventListener('click', () => {
      mae.dataset.mode = btn.dataset.mode;
      modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      if (insight) insight.textContent = INSIGHT[btn.dataset.mode] || '';
      if (sorted) order();
    }));
    sortBtn?.addEventListener('click', () => {
      sorted = !sorted;
      sortBtn.setAttribute('aria-pressed', String(sorted));
      order();
    });
    // las barras crecen cuando la tarjeta entra en pantalla
    if (hasGsap && !reduce) {
      mae.classList.add('is-pending');
      window.ScrollTrigger.create({ trigger: mae, start: 'top 82%', once: true, onEnter: () => mae.classList.remove('is-pending') });
    }
  }

  // ---------- Visor de figuras ----------
  // Lo abren las islas «Ver más» / «Ver original»: ya no hay vista previa al pasar el ratón.
  const lightbox = document.getElementById('lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-cap');

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-figure]');
      if (!trigger) return;
      const src = trigger.getAttribute('data-figure');
      if (!src) return;
      const caption = trigger.getAttribute('data-caption') || '';
      img.src = src;
      img.alt = caption;   // la leyenda describe la figura, así que sirve de texto alternativo
      cap.textContent = caption;
      lightbox.showModal();
    });

    // el clic en el fondo (el propio diálogo, fuera de la figura) cierra
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
    lightbox.querySelector('.lightbox-close')?.addEventListener('click', () => lightbox.close());
    // al cerrar, se libera la imagen para no dejarla cargada en memoria
    lightbox.addEventListener('close', () => { img.removeAttribute('src'); img.alt = ''; cap.textContent = ''; });
  }

  // ---------- Copiar correo (tarjetas de contacto del cierre) ----------
  // Sin cliente de correo configurado, el mailto no hace nada: copiar siempre funciona.
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const text = btn.getAttribute('data-copy');
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {}
    if (!ok) {
      // respaldo: deja el correo seleccionado para copiarlo a mano
      const span = btn.parentElement.querySelector('span');
      if (span) { const r = document.createRange(); r.selectNodeContents(span); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    }
    const label = btn.textContent;
    btn.textContent = ok ? 'Copiado' : 'Selecciónalo';
    setTimeout(() => { btn.textContent = label; }, 1600);
  });

  // ---------- La retícula del hero se pausa cuando el hero sale de pantalla ----------
  const hero = document.getElementById('inicio');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => hero.classList.toggle('is-out', !entry.isIntersecting)).observe(hero);
  }
})();
