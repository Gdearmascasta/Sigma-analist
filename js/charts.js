/* ==========================================================================
   Sigma Analist — gráficos interactivos: serie diaria (Problema) y explorador (Impacto)
   Inspirado en las tarjetas de gráficos de tweakcn (shadcn/ui): pestañas, leyenda que
   activa o desactiva series, tooltip con guía vertical y un deslizador. SVG propio, sin
   librerías. Datos del paper v3.36: etiquetas de las figuras 23 a 27 y cuadros 17 a 21.
   Con movimiento reducido se dibuja sin animar. Cada vista lleva una tabla .sr-only.
   ========================================================================== */
(function () {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = !reduce && window.gsap ? window.gsap : null;
  const NS = 'http://www.w3.org/2000/svg';

  // 1 468 · 12 610 · 3,0 · −38 (separador de miles con espacio fino duro, coma decimal)
  const fmt = (v, dec = 0) => {
    const s = Math.abs(v).toFixed(dec).split('.');
    const int = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + int + (s[1] ? ',' + s[1] : '');
  };

  // Nombres de los escenarios tal como los usa el paper (v3.36): A, C y D
  const SC = {
    A: 'A. Línea base: capacidad observada, reparto igual entre sectores',
    C: 'C. Capacidad según pronóstico, reparto por probabilidad',
    D: 'D. Como C, más una cuadrilla de reserva',
  };
  // Cuadro 20: costo anual esperado ($ millones) = costo con p₀ = 0 % + pendiente · p₀;
  // las pendientes reproducen las filas de 1, 3, 5 y 10 % del cuadro
  const line = (a, b) => (p) => a + b * p;
  const COST = { A: line(430.61, 35.018), C: line(400.85, 26.658), D: line(469.31, 4.970) };
  const NOMINA = 97.38; // $ millones al año por cuadrilla (Cuadro 19)

  const CHARTS = {
    marginal: {
      title: 'Horas mal dimensionadas',
      desc: 'Productividad marginal: horas en el año de prueba al añadir una cuadrilla por día (k mínimo que la justifica).',
      fig: 'assets/figuras/v30_marginal.png', cap: 'Productividad marginal de la cuadrilla en el año de prueba (Fig. 25 del paper).',
      views: {
        main: {
          type: 'bar', unit: 'h',
          cats: ['1 → 2', '2 → 3', '3 → 4', '4 → 5', '5 → 6', '6 → 7'],
          sub: ['k > 0,21', 'k > 0,48', 'k > 1,05', 'k > 2,90', 'k > 9,72', 'k > 33,14'],
          series: [
            { name: 'Déficit evitado', color: 'var(--s5)', data: [2176, 1772, 1286, 692, 256, 80] },
            { name: 'Horas ociosas añadidas', color: 'var(--s1)', data: [446, 848, 1356, 2004, 2485, 2661] },
          ],
          insight: 'La tercera cuadrilla todavía evita más déficit del que deja ocioso; la cuarta ya no (1286 h evitadas frente a 1356 h ociosas).',
        },
      },
    },
    escenarios: {
      title: 'Escenario por sector',
      desc: 'Horas de cuadrilla del 16 abr 2025 al 17 mar 2026 (336 días). Pasa por cada escenario para ver su nombre.',
      fig: 'assets/figuras/v4_escenarios_total_y_diario.png', cap: 'Horas de cuadrilla por escenario y emergencias atendidas desde otro sector (Fig. 23 del paper).',
      views: {
        horas: {
          label: 'Horas', type: 'bar', unit: 'h',
          cats: ['A', 'C', 'D'], sub: ['4 / día', '4 / día', '5 / día'], names: [SC.A, SC.C, SC.D],
          series: [
            { name: 'Horas en déficit', color: 'var(--s5)', data: [1145, 889, 270] },
            { name: 'Horas ociosas', color: 'color-mix(in srgb, var(--s1) 45%, var(--card))', data: [1724, 1635, 3733] },
            { name: 'Horas en traslados', color: 'var(--muted)', data: [755, 284, 255] },
          ],
          insight: 'Con la misma capacidad, solo repartir por probabilidad baja el déficit de 1145 a 875 h (24 % menos); C lo deja en 889 h con 3 % menos turnos.',
        },
        otro: {
          label: 'Desde otro sector', type: 'bar', unit: '%', dec: 1,
          cats: ['A', 'C', 'D'], sub: ['4 / día', '4 / día', '5 / día'], names: [SC.A, SC.C, SC.D],
          series: [{ name: 'Emergencias atendidas desde otro sector', color: 'var(--ink)', data: [29.2, 13.0, 11.4] }],
          insight: 'Con reparto igual, una cuadrilla de otro sector atiende el 29 % de las emergencias, frente al 13 % en C; cada una llega unos 28 min más tarde.',
        },
      },
    },
    equilibrio: {
      title: 'Punto de equilibrio',
      desc: 'Horas en el año de prueba y costo anual según las cuadrillas por día, con reparto por probabilidad.',
      fig: 'assets/figuras/v30_equilibrio.png', cap: 'Efecto del número de cuadrillas por día en el año de prueba (Fig. 24 del paper).',
      views: {
        horas: {
          label: 'Horas', type: 'line', unit: 'h', xTitle: 'Cuadrillas por día',
          cats: ['1', '2', '3', '4', '5', '6', '7', '8'],
          series: [
            { name: 'Horas en déficit', color: 'var(--s5)', data: [6268, 4093, 2320, 1035, 343, 87, 7, 0] },
            { name: 'Horas ociosas', color: 'var(--s1)', data: [85, 531, 1379, 2735, 4739, 7224, 9885, 12610] },
          ],
          // cruce entre 3 y 4 cuadrillas, con unas 1862 h de cada clase (sección 7.2.3)
          marker: { x: 2.356, y: 1862, label: 'Equilibrio entre 3 y 4: se toman 4' },
          insight: 'Las curvas se cortan entre 3 y 4 cuadrillas, con unas 1862 h de cada clase; con 4 por día el déficit baja a 1035 h.',
        },
        costo: {
          label: 'Costo', type: 'line', unit: 'M COP', xTitle: 'Cuadrillas por día',
          cats: ['1', '2', '3', '4', '5', '6', '7', '8'],
          series: [
            { name: 'Nómina de cuadrillas', color: 'var(--muted)', data: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => Math.round(n * NOMINA)) },
            { name: 'Horas extra por déficit', color: 'var(--s5)', data: [285, 187, 108, 50, 19, 6, 2, 1] },
            { name: 'Costo total (incluye traslados)', color: 'var(--ink)', data: [382, 382, 400, 440, 506, 591, 684, 781] },
          ],
          insight: 'El costo mínimo es con 2 cuadrillas (382 M COP), pero no es operable; con las 4 del equilibrio cuesta 440 M COP y mejora el cumplimiento.',
        },
      },
    },
    flujo: {
      title: 'Flujo de caja y rentabilidad',
      desc: 'Escenarios C y D frente a la línea base, en millones de pesos corrientes, a cinco años (TMAR 15,24 %).',
      fig: 'assets/figuras/v30_flujo_caja.png', cap: 'Flujo de caja de los escenarios C y D frente a la línea base (Fig. 27 del paper).',
      views: {
        anual: {
          label: 'Anual', type: 'bar', unit: 'M COP', xTitle: 'Año',
          cats: ['0', '1', '2', '3', '4', '5'], names: ['Año 0 (inversión)', 'Año 1', 'Año 2', 'Año 3 (mantenimiento mayor)', 'Año 4', 'Año 5'],
          series: [
            { name: 'Escenario C', color: 'var(--s1)', data: [-38, 25, 27, 55, 47, 67] },
            { name: 'Escenario D', color: 'var(--s5)', data: [-38, -45, -48, -30, -31, -12] },
          ],
          insight: 'C recupera la inversión de 37,89 M COP en 21,76 meses (TIR 83,14 %, B/C 3,62); todos los flujos de D son negativos.',
        },
        acum: {
          label: 'Acumulado', type: 'line', unit: 'M COP', xTitle: 'Año',
          cats: ['0', '1', '2', '3', '4', '5'], names: ['Año 0', 'Año 1', 'Año 2', 'Año 3', 'Año 4', 'Año 5'],
          series: [
            { name: 'Escenario C', color: 'var(--s1)', data: [-38, -16, 4, 40, 66, 99] },
            { name: 'Escenario D', color: 'var(--s5)', data: [-38, -77, -113, -133, -150, -156] },
          ],
          insight: 'Descontado, C cierra con un VPN de 99,36 M COP y D con −156,16 M COP; en 10 000 simulaciones de Monte Carlo, C siempre fue positivo.',
        },
      },
    },
    incumplimiento: {
      title: 'Costo por incumplimiento',
      desc: 'Costo anual esperado (M COP) según la probabilidad anual de una multa de 2000 SMMLV. Mueve el control.',
      fig: 'assets/figuras/v31_incumplimiento.png', cap: 'Costo anual esperado según la probabilidad de sanción (Fig. 26 del paper).',
      views: {
        main: {
          type: 'xy', unit: 'M COP', xTitle: 'Probabilidad anual de sanción, p₀ (%)', x: [0, 10], slider: 3,
          series: [
            { name: SC.A.split(':')[0], color: 'var(--ink)', f: COST.A },
            { name: 'C. Capacidad por pronóstico', color: 'var(--s1)', f: COST.C },
            { name: 'D. C con reserva', color: 'var(--s5)', f: COST.D },
          ],
          insight: (p) => {
            const best = Object.entries(COST).map(([k, f]) => [k, f(p)]).sort((a, b) => a[1] - b[1])[0];
            const names = { A: 'la línea base', C: 'la capacidad por pronóstico (C)', D: 'la reserva (D)' };
            return `Con p₀ = ${fmt(p, 1)} %, lo más barato es ${names[best[0]]}: ${fmt(best[1])} M COP. Según el paper, D supera a C desde p₀ = 3 %.`;
          },
        },
      },
    },
  };

  // ---------- Utilidades SVG ----------
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  };
  // pasos "redondos" para el eje: 1, 2, 2,5 o 5 por potencia de diez
  function niceTicks(min, max, count = 5) {
    const raw = (max - min) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(6));
    return out;
  }

  // ==========================================================================
  // Explorador de Impacto
  // ==========================================================================
  function initExplorer(root) {
    // ---------- Estado y nodos ----------
    const plot = root.querySelector('[data-exp-plot]');
    const titleEl = root.querySelector('[data-exp-title]');
    const descEl = root.querySelector('[data-exp-desc]');
    const subEl = root.querySelector('[data-exp-sub]');
    const legendEl = root.querySelector('[data-exp-legend]');
    const insightEl = root.querySelector('[data-exp-insight]');
    const island = root.querySelector('[data-exp-island]');
    const tabs = Array.from(root.querySelectorAll('[data-chart]'));
    const state = { chart: 'marginal', view: null, hidden: new Set(), p: 3.2, idx: -1 };

    // el SVG usa el ancho real del contenedor (1 unidad = 1 px): el texto de los ejes no encoge
    let W = 640, H = 300;
    const M = { l: 52, r: 12, t: 18, b: 52 };

    function currentView() {
      const c = CHARTS[state.chart];
      return c.views[state.view] || Object.values(c.views)[0];
    }

    // ---------- Dibujo ----------
    function render(animate) {
      const v = currentView();
      const series = v.series.filter((s) => !state.hidden.has(s.name));
      W = Math.max(300, Math.round(plot.clientWidth || 640));
      H = Math.round(Math.min(340, Math.max(240, W * 0.56)));
      plot.textContent = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', 'aria-hidden': 'true', focusable: 'false' }, plot);
      const tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.hidden = true;
      plot.append(tip);

      const isXY = v.type === 'xy';
      const n = isXY ? 0 : v.cats.length;
      const values = isXY
        ? series.flatMap((s) => [s.f(v.x[0]), s.f(v.x[1])])
        : series.flatMap((s) => s.data);
      const ticks = niceTicks(Math.min(isXY ? Math.min(...values) : 0, ...values), Math.max(...values, 0) || 1);
      const y0 = ticks[0], y1 = ticks[ticks.length - 1];
      const Y = (val) => M.t + (H - M.t - M.b) * (1 - (val - y0) / (y1 - y0));
      const band = (W - M.l - M.r) / Math.max(n, 1);
      const CX = (i) => M.l + band * (i + 0.5);
      const XX = (p) => M.l + (W - M.l - M.r) * (p - v.x[0]) / (v.x[1] - v.x[0]);

      // rejilla y eje y
      const gGrid = el('g', { class: 'grid' }, svg);
      ticks.forEach((t) => {
        el('line', { x1: M.l, x2: W - M.r, y1: Y(t), y2: Y(t), class: t === 0 ? 'zero' : '' }, gGrid);
        el('text', { x: M.l - 8, y: Y(t) + 4, class: 'ylab' }, gGrid).textContent = fmt(t, v.dec && t % 1 ? 1 : 0);
      });
      // eje x
      const gx = el('g', { class: 'xaxis' }, svg);
      if (isXY) {
        for (let p = v.x[0]; p <= v.x[1]; p += 2) el('text', { x: XX(p), y: H - M.b + 18, class: 'xlab' }, gx).textContent = fmt(p);
      } else {
        v.cats.forEach((c, i) => {
          // en columnas estrechas la segunda línea se solaparía: queda en el tooltip
          el('text', { x: CX(i), y: H - M.b + 18, class: band < 52 ? 'xlab sm' : 'xlab' }, gx).textContent = c;
          if (v.sub && band >= 64) el('text', { x: CX(i), y: H - M.b + 33, class: 'xsub' }, gx).textContent = v.sub[i];
        });
      }
      if (v.xTitle) el('text', { x: (M.l + W - M.r) / 2, y: H - 4, class: 'xtitle' }, gx).textContent = v.xTitle;

      // columna resaltada al pasar (debajo de las series)
      const hl = el('rect', { class: 'hl', y: M.t, height: H - M.t - M.b, width: isXY ? 1.5 : band, x: -999 }, svg);
      const gData = el('g', { class: 'data' }, svg);
      const base = Y(Math.max(y0, Math.min(0, y1)));

      if (v.type === 'bar') {
        const inner = band * 0.72;
        const bw = inner / series.length;
        series.forEach((s, si) => {
          s.data.forEach((val, i) => {
            const x = CX(i) - inner / 2 + si * bw + 1;
            const y = Math.min(Y(val), base);
            const h = Math.max(Math.abs(Y(val) - base), 1);
            const r = el('rect', { x, y, width: Math.max(bw - 2, 2), height: h, rx: 3, style: `fill:${s.color}` }, gData);
            if (animate && gsap) gsap.from(r, { attr: { y: base, height: 0 }, duration: 0.7, ease: 'power3.out', delay: i * 0.05 + si * 0.08 });
          });
        });
      } else {
        series.forEach((s, si) => {
          const pts = isXY
            ? [[XX(v.x[0]), Y(s.f(v.x[0]))], [XX(v.x[1]), Y(s.f(v.x[1]))]]
            : s.data.map((val, i) => [CX(i), Y(val)]);
          const path = el('path', { d: 'M' + pts.map((p) => p.join(' ')).join('L'), class: 'ln', pathLength: 1, style: `stroke:${s.color}` }, gData);
          if (animate && gsap) gsap.fromTo(path, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', delay: si * 0.12 });
          if (!isXY) pts.forEach(([x, y], i) => {
            const d = el('circle', { cx: x, cy: y, r: 3.5, class: 'pt', style: `fill:${s.color}` }, gData);
            if (animate && gsap) gsap.from(d, { attr: { r: 0 }, duration: 0.35, ease: 'back.out(2)', delay: 0.4 + i * 0.07 + si * 0.12 });
          });
        });
      }

      // marca del equilibrio
      if (v.marker && series.length === v.series.length) {
        const mx = CX(v.marker.x), my = Y(v.marker.y);
        el('line', { x1: mx, x2: mx, y1: my, y2: base, class: 'mk-line' }, gData);
        const dm = el('path', { d: `M${mx} ${my - 7}L${mx + 7} ${my}L${mx} ${my + 7}L${mx - 7} ${my}Z`, class: 'mk' }, gData);
        el('text', { x: mx + 10, y: my - 10, class: 'mk-lab' }, gData).textContent = v.marker.label;
        if (animate && gsap) gsap.from(dm, { scale: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(2)', delay: 1 });
      }

      // deslizador: guía y puntos en el valor elegido
      let slide = null;
      if (v.slider != null) {
        slide = el('g', { class: 'slide' }, svg);
        const paintSlide = () => {
          slide.textContent = '';
          const x = XX(state.p);
          el('line', { x1: x, x2: x, y1: M.t, y2: H - M.b, class: 'slide-line' }, slide);
          series.forEach((s) => el('circle', { cx: x, cy: Y(s.f(state.p)), r: 4.5, class: 'pt', style: `fill:${s.color}` }, slide));
          insightEl.textContent = v.insight(state.p);
        };
        paintSlide();
        plot._paintSlide = paintSlide;
      } else {
        plot._paintSlide = null;
        insightEl.textContent = v.insight || '';
      }

      // ---------- Tooltip ----------
      function show(i, px) {
        state.idx = i;
        let title, rows;
        if (isXY) {
          const p = Math.round(i * 10) / 10;
          hl.setAttribute('x', XX(p) - 0.75);
          title = `p₀ = ${fmt(p, 1)} %`;
          rows = series.map((s) => [s, s.f(p)]);
        } else {
          hl.setAttribute('x', CX(i) - band / 2);
          title = (v.names && v.names[i]) || (v.cats[i] + (v.sub ? ` · ${v.sub[i]}` : ''));
          rows = series.map((s) => [s, s.data[i]]);
        }
        tip.innerHTML = '';
        const t = document.createElement('p');
        t.className = 'chart-tip-title';
        t.textContent = title;
        tip.append(t);
        rows.forEach(([s, val]) => {
          const r = document.createElement('p');
          r.className = 'chart-tip-row';
          r.innerHTML = '<i></i><span></span><b></b>';
          r.querySelector('i').style.background = s.color;
          r.querySelector('span').textContent = s.name;
          r.querySelector('b').textContent = `${fmt(val, v.dec || 0)} ${v.unit}`;
          tip.append(r);
        });
        tip.hidden = false;
        const box = plot.getBoundingClientRect();
        const scale = box.width / W;
        const anchor = (isXY ? XX(i) : CX(i)) * scale;
        const tw = tip.offsetWidth;
        const left = anchor + 14 + tw > box.width ? anchor - 14 - tw : anchor + 14;
        tip.style.left = Math.max(0, left) + 'px';
        tip.style.top = (px != null ? Math.max(0, Math.min(px - 20, box.height - tip.offsetHeight)) : 8) + 'px';
      }
      function hide() { tip.hidden = true; hl.setAttribute('x', -999); state.idx = -1; }
      plot.onpointermove = (e) => {
        const box = plot.getBoundingClientRect();
        const sx = (e.clientX - box.left) * (W / box.width);
        if (isXY) {
          const p = Math.max(v.x[0], Math.min(v.x[1], (sx - M.l) / (W - M.l - M.r) * (v.x[1] - v.x[0])));
          show(p, e.clientY - box.top);
        } else {
          const i = Math.max(0, Math.min(n - 1, Math.floor((sx - M.l) / band)));
          show(i, e.clientY - box.top);
        }
      };
      plot.onpointerleave = hide;
      // teclado: flechas recorren categorías (o p₀ de 0,5 en 0,5)
      plot.onkeydown = (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) return;
        e.preventDefault();
        if (e.key === 'Escape') return hide();
        if (isXY) {
          const cur = state.idx < 0 ? state.p : state.idx;
          const p = e.key === 'Home' ? 0 : e.key === 'End' ? 10 : Math.max(0, Math.min(10, cur + (e.key === 'ArrowRight' ? 0.5 : -0.5)));
          show(p);
        } else {
          const cur = state.idx < 0 ? -1 : state.idx;
          const i = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)));
          show(i);
        }
      };
      plot.onblur = hide;

      // tabla accesible con los mismos datos
      // .sr-only va en un div: una tabla no se encoge a 1 px y ensancharía la página
      const table = document.createElement('table');
      const head = isXY ? ['p₀ (%)', ...series.map((s) => s.name)] : ['', ...series.map((s) => s.name)];
      const body = isXY
        ? [0, 2, 4, 6, 8, 10].map((p) => [fmt(p), ...series.map((s) => fmt(s.f(p)))])
        : v.cats.map((c, i) => [(v.names && v.names[i]) || c, ...series.map((s) => fmt(s.data[i], v.dec || 0))]);
      table.innerHTML = `<caption>${CHARTS[state.chart].title} (${v.unit})</caption>`;
      const tr = (cells, tag) => '<tr>' + cells.map((x) => `<${tag}>${x}</${tag}>`).join('') + '</tr>';
      table.innerHTML += '<thead>' + tr(head, 'th') + '</thead><tbody>' + body.map((r) => tr(r, 'td')).join('') + '</tbody>';
      const srWrap = document.createElement('div');
      srWrap.className = 'sr-only';
      srWrap.append(table);
      plot.append(srWrap);
    }

    // ---------- Controles ----------
    function buildControls() {
      const c = CHARTS[state.chart];
      const v = currentView();
      titleEl.textContent = c.title;
      descEl.textContent = c.desc;
      island.setAttribute('data-figure', c.fig);
      island.setAttribute('data-caption', c.cap);

      subEl.textContent = '';
      const keys = Object.keys(c.views);
      if (keys.length > 1) {
        const seg = document.createElement('div');
        seg.className = 'segmented seg-sm';
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', 'Vista');
        keys.forEach((k) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = c.views[k].label;
          b.setAttribute('aria-pressed', String(c.views[k] === v));
          b.addEventListener('click', () => { state.view = k; state.hidden.clear(); buildControls(); render(true); });
          seg.append(b);
        });
        subEl.append(seg);
      }
      if (v.slider != null) {
        const wrap = document.createElement('label');
        wrap.className = 'slider';
        wrap.innerHTML = '<span>p₀</span><input type="range" min="0" max="10" step="0.1"><output></output>';
        const input = wrap.querySelector('input');
        const out = wrap.querySelector('output');
        input.value = state.p;
        out.textContent = fmt(state.p, 1) + ' %';
        input.setAttribute('aria-label', 'Probabilidad anual de sanción en porcentaje');
        input.addEventListener('input', () => {
          state.p = +input.value;
          out.textContent = fmt(state.p, 1) + ' %';
          plot._paintSlide && plot._paintSlide();
        });
        subEl.append(wrap);
      }

      legendEl.textContent = '';
      v.series.forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lg-btn';
        b.innerHTML = '<i></i><span></span>';
        b.querySelector('i').style.background = s.color;
        b.querySelector('span').textContent = s.name;
        b.setAttribute('aria-pressed', String(!state.hidden.has(s.name)));
        b.addEventListener('click', () => {
          const visible = v.series.filter((x) => !state.hidden.has(x.name));
          if (!state.hidden.has(s.name) && visible.length === 1) return; // siempre queda una serie
          if (state.hidden.has(s.name)) state.hidden.delete(s.name); else state.hidden.add(s.name);
          b.setAttribute('aria-pressed', String(!state.hidden.has(s.name)));
          render(true);
        });
        legendEl.append(b);
      });
      plot.setAttribute('tabindex', '0');
      plot.setAttribute('aria-label', `${c.title}. ${c.desc} Usa las flechas para recorrer los valores.`);
    }

    tabs.forEach((t) => t.addEventListener('click', () => {
      state.chart = t.dataset.chart;
      state.view = null;
      state.hidden.clear();
      tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
      buildControls();
      render(true);
    }));

    let lastW = 0, resizeRaf = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const w = Math.round(plot.clientWidth);
        if (w && Math.abs(w - lastW) > 4) { lastW = w; render(false); }
      });
    });

    buildControls();
    // la primera vista se anima al entrar en pantalla; antes se dibuja quieta para que ocupe su sitio
    render(false);
    if (gsap && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); render(true); } }, { threshold: 0.3 });
      io.observe(root);
    }
  }

  // ==========================================================================
  // Serie diaria de la Fig. 6 (Problema): gráfico de área al estilo tweakcn
  // Periodo (todo, desde 2023, año de prueba), medias anuales que hacen zoom,
  // bandas de la partición temporal y tooltip con la fecha.
  // ==========================================================================
  function initSerie(card, data) {
    const plot = card.querySelector('[data-serie-plot]');
    const yearsEl = card.querySelector('[data-serie-years]');
    const insightEl = card.querySelector('[data-serie-insight]');
    const rangeBtns = Array.from(card.querySelectorAll('[data-range]'));
    const DAY = 864e5;
    const t0 = Date.parse(data.start + 'T00:00:00Z');
    const ma = data.ma.split(',').map((v) => +v / 10);
    const dayOf = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - t0) / DAY);
    const dateOf = (i) => new Date(t0 + i * DAY);
    const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const fdate = (i) => { const d = dateOf(i); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
    const blocks = data.blocks.map((b) => ({ name: b.name, a: dayOf(b.from), b: dayOf(b.to) }));
    const peak = { i: dayOf(data.peak.date), v: data.peak.value };
    const last = ma.length - 1;
    const RANGES = {
      all: { a: 0, b: last, text: 'La media anual pasó de 12,1 emergencias por día en 2017 a 20,2 en 2024 y bajó a 18,5 en 2025; el máximo diario fue de 97, el 6 de junio de 2024.' },
      2023: { a: dayOf('2023-01-01'), b: last, text: 'El bloque de validación (mayo de 2024 a abril de 2025) fue el más alto y variable de la serie: 22 emergencias por día de media y un pico de 97.' },
      test: { a: blocks[2].a, b: blocks[2].b, text: 'En el año de prueba la demanda volvió a una media de 17 emergencias por día, con menos variación que en validación.' },
    };
    let range = { a: 0, b: last };
    let W = 640, H = 280;
    const M = { l: 40, r: 12, t: 26, b: 30 };

    function render(animate) {
      W = Math.max(300, Math.round(plot.clientWidth || 640));
      H = Math.round(Math.min(320, Math.max(220, W * 0.5)));
      plot.textContent = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', 'aria-hidden': 'true', focusable: 'false' }, plot);
      const tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.hidden = true;
      plot.append(tip);

      const { a, b } = range;
      const span = b - a;
      const step = Math.max(1, Math.ceil(span / 700)); // ~700 vértices como máximo
      const idx = [];
      for (let i = a; i <= b; i += step) idx.push(i);
      if (idx[idx.length - 1] !== b) idx.push(b);
      const vals = idx.map((i) => ma[i]);
      const ticks = niceTicks(0, Math.max(...vals) * 1.08, 4);
      const ymax = ticks[ticks.length - 1];
      const X = (i) => M.l + (W - M.l - M.r) * (i - a) / Math.max(span, 1);
      const Y = (v) => M.t + (H - M.t - M.b) * (1 - v / ymax);

      // bandas de la partición temporal (debajo de todo)
      const gB = el('g', { class: 'blocks' }, svg);
      blocks.forEach((bl, k) => {
        const x1 = X(Math.max(bl.a, a)), x2 = X(Math.min(bl.b, b));
        if (x2 - x1 < 2) return;
        el('rect', { x: x1, y: M.t - 18, width: x2 - x1, height: H - M.b - M.t + 18, class: `blk blk-${k}` }, gB);
        if (x2 - x1 > 70) el('text', { x: x1 + 6, y: M.t - 6, class: 'blk-lab' }, gB).textContent = bl.name;
      });
      const gGrid = el('g', { class: 'grid' }, svg);
      ticks.forEach((t) => {
        el('line', { x1: M.l, x2: W - M.r, y1: Y(t), y2: Y(t), class: t === 0 ? 'zero' : '' }, gGrid);
        el('text', { x: M.l - 6, y: Y(t) + 4, class: 'ylab' }, gGrid).textContent = fmt(t);
      });
      // marcas del eje x: años en periodos largos, meses en el año de prueba
      const gx = el('g', { class: 'xaxis' }, svg);
      const d0 = dateOf(a), d1 = dateOf(b);
      if (span > 500) {
        const everyOther = (W - M.l - M.r) / (span / 365) < 46;
        for (let y = d0.getUTCFullYear() + (d0.getUTCMonth() > 0 || d0.getUTCDate() > 2 ? 1 : 0); y <= d1.getUTCFullYear(); y++) {
          if (everyOther && y % 2) continue;
          const i = dayOf(`${y}-01-01`);
          el('text', { x: X(Math.max(i, a)), y: H - M.b + 18, class: 'xlab' }, gx).textContent = String(y);
        }
      } else {
        for (let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); d <= d1; d.setUTCMonth(d.getUTCMonth() + (W < 480 ? 2 : 1))) {
          const i = Math.round((d - t0) / DAY);
          el('text', { x: X(i), y: H - M.b + 18, class: 'xlab sm' }, gx).textContent = MES[d.getUTCMonth()];
        }
      }

      // área con degradado y línea de la media móvil
      const gid = 'serie-grad';
      const defs = el('defs', {}, svg);
      const lg = el('linearGradient', { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
      el('stop', { offset: '0%', style: 'stop-color:var(--c);stop-opacity:.35' }, lg);
      el('stop', { offset: '100%', style: 'stop-color:var(--c);stop-opacity:.02' }, lg);
      const pts = idx.map((i, k) => `${X(i).toFixed(1)} ${Y(vals[k]).toFixed(1)}`);
      const area = el('path', { d: `M${X(a)} ${Y(0)}L${pts.join('L')}L${X(b)} ${Y(0)}Z`, style: `fill:url(#${gid})` }, svg);
      const ln = el('path', { d: 'M' + pts.join('L'), class: 'ln', pathLength: 1, style: 'stroke:var(--ci);stroke-width:2' }, svg);
      if (animate && gsap) {
        gsap.fromTo(ln, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' });
        gsap.from(area, { opacity: 0, duration: 0.8, delay: 0.5 });
      }
      // pico diario: la media móvil lo suaviza, así que se marca aparte con su valor real
      if (peak.i >= a && peak.i <= b) {
        const px = X(peak.i);
        el('line', { x1: px, x2: px, y1: M.t, y2: H - M.b, class: 'mk-line' }, svg);
        el('text', { x: px + (px > W - 150 ? -6 : 6), y: M.t + 12, class: 'mk-lab' + (px > W - 150 ? ' end' : '') }, svg).textContent = W < 480 ? 'Pico: 97' : 'Pico diario: 97 (6 jun 2024)';
      }

      // tooltip
      const guide = el('line', { y1: M.t, y2: H - M.b, class: 'slide-line', x1: -9, x2: -9 }, svg);
      const dot = el('circle', { r: 4.5, class: 'pt', style: 'fill:var(--ci)', cx: -9, cy: -9 }, svg);
      let cur = -1;
      function show(i) {
        cur = Math.max(a, Math.min(b, i));
        const x = X(cur), y = Y(ma[cur]);
        guide.setAttribute('x1', x); guide.setAttribute('x2', x);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        const yr = dateOf(cur).getUTCFullYear();
        const blk = blocks.find((bl) => cur >= bl.a && cur <= bl.b);
        tip.innerHTML = '<p class="chart-tip-title"></p><p class="chart-tip-row"><i></i><span>Media móvil 30 días</span><b></b></p><p class="chart-tip-row"><i class="hollow"></i><span></span><b></b></p>';
        tip.querySelector('.chart-tip-title').textContent = fdate(cur) + (blk ? ` · ${blk.name.toLowerCase()}` : '');
        const rows = tip.querySelectorAll('.chart-tip-row');
        rows[0].querySelector('i').style.background = 'var(--ci)';
        rows[0].querySelector('b').textContent = fmt(ma[cur], 1);
        rows[1].querySelector('span').textContent = `Media anual ${yr}`;
        rows[1].querySelector('b').textContent = fmt(data.years[yr], 1);
        tip.hidden = false;
        const scale = plot.getBoundingClientRect().width / W;
        const tw = tip.offsetWidth;
        tip.style.left = Math.max(0, x * scale + 14 + tw > plot.clientWidth ? x * scale - 14 - tw : x * scale + 14) + 'px';
        tip.style.top = '6px';
      }
      function hide() { tip.hidden = true; guide.setAttribute('x1', -9); guide.setAttribute('x2', -9); dot.setAttribute('cx', -9); cur = -1; }
      plot.onpointermove = (e) => {
        const box = plot.getBoundingClientRect();
        const sx = (e.clientX - box.left) * (W / box.width);
        show(Math.round(a + (sx - M.l) / (W - M.l - M.r) * span));
      };
      plot.onpointerleave = hide;
      plot.onblur = hide;
      plot.onkeydown = (e) => {
        const jump = span > 500 ? 30 : 7;
        const keys = { ArrowLeft: -jump, ArrowRight: jump };
        if (e.key === 'Escape') return hide();
        if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); return show(e.key === 'Home' ? a : b); }
        if (!(e.key in keys)) return;
        e.preventDefault();
        show((cur < 0 ? a : cur) + keys[e.key]);
      };
    }

    function setRange(r, label, text) {
      range = r;
      insightEl.textContent = text;
      plot.setAttribute('aria-label', `Media móvil de 30 días, ${label}. Usa las flechas para recorrer las fechas.`);
      render(true);
    }

    // medias anuales: barras pequeñas que además hacen zoom a su año
    const ys = Object.keys(data.years);
    const vmax = Math.max(...Object.values(data.years));
    ys.forEach((y) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'yr';
      btn.setAttribute('aria-pressed', 'false');
      btn.style.setProperty('--h', (data.years[y] / vmax).toFixed(3));
      btn.innerHTML = '<span class="yr-bar" aria-hidden="true"></span><b></b><span class="yr-y"></span>';
      btn.querySelector('b').textContent = fmt(data.years[y], 1);
      btn.querySelector('.yr-y').textContent = y;
      btn.setAttribute('aria-label', `${y}: media de ${fmt(data.years[y], 1)} emergencias por día. Ver solo ese año.`);
      btn.addEventListener('click', () => {
        const a = Math.max(0, dayOf(`${y}-01-01`)), b = Math.min(last, dayOf(`${y}-12-31`));
        rangeBtns.forEach((x) => x.setAttribute('aria-pressed', 'false'));
        yearsEl.querySelectorAll('.yr').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
        setRange({ a, b }, `año ${y}`, `Media de ${y}: ${fmt(data.years[y], 1)} emergencias por día${y === '2026' ? ' (hasta el 17 de marzo)' : ''}.`);
      });
      yearsEl.append(btn);
    });
    rangeBtns.forEach((btn) => btn.addEventListener('click', () => {
      const r = RANGES[btn.dataset.range];
      rangeBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      yearsEl.querySelectorAll('.yr').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      setRange({ a: r.a, b: r.b }, btn.textContent.toLowerCase(), r.text);
    }));

    plot.setAttribute('tabindex', '0');
    plot.setAttribute('aria-label', 'Media móvil de 30 días de la demanda diaria, 2017 a 2026. Usa las flechas para recorrer las fechas.');
    render(false);
    let lastW = 0, raf = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { const w = Math.round(plot.clientWidth); if (w && Math.abs(w - lastW) > 4) { lastW = w; render(false); } });
    });
    if (gsap && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); render(true); } }, { threshold: 0.3 });
      io.observe(card);
    }
  }

  const exp = document.querySelector('[data-explorer]');
  if (exp) initExplorer(exp);
  const serie = document.querySelector('[data-serie]');
  if (serie && window.SIGMA_SERIE) initSerie(serie, window.SIGMA_SERIE);
})();
