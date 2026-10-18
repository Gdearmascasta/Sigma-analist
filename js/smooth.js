/* ==========================================================================
   Scroll suave con inercia (Lenis), sincronizado con el reloj de GSAP.
   Hace el desplazamiento más lento y continuo para que los giros de la regla
   y los revelados se aprecien con detalle. Se desactiva con movimiento reducido.
   ========================================================================== */
(function () {
  'use strict';
  if (typeof window.Lenis === 'undefined') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new window.Lenis({
    lerp: 0.07,             // fracción del recorrido pendiente que avanza cada fotograma (menos = más suave)
    wheelMultiplier: 0.7,   // cada paso de rueda desplaza un 30 % menos
    touchMultiplier: 1,
    smoothWheel: true,
    syncTouch: false,       // en pantallas táctiles se respeta el desplazamiento nativo
  });

  if (window.gsap) {
    // un solo reloj para Lenis, GSAP y ScrollTrigger: evita saltos entre sistemas
    window.gsap.ticker.add((time) => lenis.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
    if (window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  window.creinnovaLenis = lenis;
})();
