/* ==========================================================================
   Sigma Analist — revelados, intro, menú móvil, visor de figuras y anclas
   Los revelados replican la coreografía de getartcraft.com (GSAP + ScrollTrigger):
     [data-choreo]       línea superior que se dibuja + puntos de esquina + rótulo
     [data-reveal]       sube 28 px y pasa de desenfocado a nítido
     [data-reveal-group] sus hijos entran en ola de izquierda a derecha
   ========================================================================== */
(function () {
  'use strict';

  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) document.documentElement.classList.remove('js');

  // ---------- Revelados ----------
  if (hasGsap) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // nunca 'all': borraría también las variables CSS en línea (--c, --ci) de cada sección
    const CLEAR = 'opacity,visibility,transform,filter';
    const FROM = { autoAlpha: 0, y: 28, filter: 'blur(8px)' };
    const TO = { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', overwrite: true, clearProps: CLEAR };

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Intro del hero en cascada
      const intro = gsap.utils.toArray('[data-intro]');
      gsap.set(intro, FROM);
      document.documentElement.classList.add('intro-done');
      const tl = gsap.timeline({ delay: 0.15 });
      tl.to(intro, { ...TO, stagger: 0.09 });
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

      gsap.utils.toArray('[data-reveal]:not([data-reveal-group] [data-reveal])').forEach((node) => {
        gsap.set(node, FROM);
        ScrollTrigger.create({ trigger: node, start: 'top 85%', once: true, onEnter: () => gsap.to(node, TO) });
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
    history.replaceState(null, '', '#' + id);
  });

  // ---------- Menú móvil ----------
  const nav = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  function setMenu(open) {
    if (!nav || !burger) return;
    nav.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
  burger?.addEventListener('click', () => setMenu(!nav.classList.contains('nav-open')));
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-open .nav-links a')) { setMenu(false); return; }
    if (!e.target.closest('#nav')) setMenu(false);   // clic fuera cierra
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 760px)').addEventListener?.('change', (e) => { if (e.matches) setMenu(false); });

  // ---------- Visor de figuras ----------
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
})();
