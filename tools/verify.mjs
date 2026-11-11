// Verificación visual con Chrome real (protocolo DevTools, sin dependencias).
// Uso:
//   python3 -m http.server 8765        (en la raíz del proyecto, otra terminal)
//   node tools/verify.mjs [url] [salida] [ancho] [alto]
// Genera capturas en posiciones clave del scroll, una secuencia de un giro
// de título y un informe de errores de consola. Sale con código 1 si hubo errores.
// El binario de Chrome se puede indicar con la variable de entorno CHROME
// (por defecto «google-chrome»): CHROME=chromium node tools/verify.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const url = process.argv[2] || 'http://127.0.0.1:8765/';
const out = path.resolve(process.argv[3] || 'verify-out');
const W = +(process.argv[4] || 1440);
const H = +(process.argv[5] || 900);
const port = 9400 + Math.floor(Math.random() * 400);
fs.mkdirSync(out, { recursive: true });
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'creinnova-verify-'));

const chromePath = process.env.CHROME || process.env.CHROME_BIN || 'google-chrome';
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
chrome.on('error', (err) => { console.error(`No se pudo ejecutar «${chromePath}»: ${err.message}`); process.exit(2); });
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
}
if (!wsUrl) { console.error(`No se pudo conectar con Chrome («${chromePath}»)`); chrome.kill(); process.exit(2); }

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') problems.push('EXCEPCIÓN: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
    problems.push(`console.${m.params.type}: ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
    problems.push('log: ' + m.params.entry.text + (m.params.entry.url ? ' ' + m.params.entry.url : ''));
};
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r?.exceptionDetails) problems.push('EXCEPCIÓN en la verificación: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r?.result?.value;
};
const shot = async (name) => {
  const r = await cmd('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.data, 'base64'));
};

await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Log.enable');
// se emula un sistema en modo oscuro: la página no tiene tema oscuro y debe verse igual
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: process.env.SCHEME || 'dark' }] });
await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
await cmd('Page.navigate', { url });
await sleep(+(process.env.WAIT || 2500));

// desplazamiento programático que respeta el scroll suave (Lenis) si está activo
await evaluate(`window.__go = (y) => window.creinnovaLenis ? window.creinnovaLenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)`);
await shot('00-inicio');
const info = await evaluate(`(() => {
  const secs = [...document.querySelectorAll('[data-section]')].map(s => ({ id: s.id, top: Math.round(s.getBoundingClientRect().top + scrollY), h: Math.round(s.offsetHeight) }));
  return { docH: document.documentElement.scrollHeight, vh: innerHeight, secs, rulerOn: document.getElementById('ruler').classList.contains('is-on'),
           letters: document.querySelectorAll('.ruler-letter').length, hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
})()`);
console.log(JSON.stringify(info, null, 1));

// Capturas a mitad y al final del giro de varias secciones
const cfg = await evaluate('JSON.stringify(window.CreinnovaRuler && window.CreinnovaRuler.config)').then(JSON.parse);
const flipEnd = 64 + H * cfg.flipLine;
const flipStart = flipEnd + cfg.flipZone;

// ¿Cabe el título más largo, a tamaño de título actual, en la reserva lateral sin tocar el contenido?
const fit = await evaluate(`(() => {
  const words = [...document.querySelectorAll('.ruler-word')];
  const content = Math.max(...[...document.querySelectorAll('.wrap')].map(w => w.getBoundingClientRect().right));
  const right = innerWidth - ${cfg.railW} - ${cfg.textPad};
  const probe = document.createElement('span'); probe.className = 'ruler-letter ruler-measure'; document.body.appendChild(probe);
  let widest = 0, label = '';
  for (const w of words) { probe.textContent = w.textContent; const px = probe.getBoundingClientRect().width * ${cfg.headingPx} / 100; if (px > widest) { widest = px; label = w.textContent; } }
  probe.remove();
  return { label, widest: Math.round(widest), left: Math.round(right - widest), content: Math.round(content) };
})()`);
if (info.rulerOn) {
  console.log(`título más ancho: «${fit.label}» ${fit.widest}px, empieza en x=${fit.left}; contenido termina en x=${fit.content} ${fit.left > fit.content ? 'OK' : 'SE SOLAPA'}`);
  if (fit.left <= fit.content) problems.push('el título actual se solapa con el contenido');
}
for (const target of ['problema', 'metodo', 'resultados']) {
  const s = info.secs.find((x) => x.id === target);
  if (!s) continue;
  // secuencia del giro: secTop recorre de flipStart a flipEnd
  for (const [i, t] of [0, 0.25, 0.5, 0.75, 1].entries()) {
    const secTop = flipStart - t * cfg.flipZone;
    await evaluate(`window.__go(${Math.round(s.top - secTop)})`);
    await sleep(t === 0 ? 1200 : 120);
    await shot(`flip-${target}-${i}`);
  }
}

// Ajuste automático: detenerse con un giro al 40 % debe devolverlo al inicio (secTop = flipStart)
if (info.rulerOn) {
  const s = info.secs.find((x) => x.id === 'resultados');
  const half = Math.round(s.top - (flipStart - 0.4 * cfg.flipZone));
  await evaluate(`window.__go(${half})`);
  await sleep(2200);
  const snapped = await evaluate('scrollY');
  const expect = Math.round(s.top - flipStart);
  console.log(`ajuste de giro: ${half} → ${snapped} (esperado ≈ ${expect}) ${Math.abs(snapped - expect) <= 2 ? 'OK' : 'FALLA'}`);
  if (Math.abs(snapped - expect) > 2) problems.push('el ajuste automático del giro no llegó a su destino');
}

// Fluidez con rueda real: 6 pasos de rueda y se mide scrollY en cada fotograma
if (info.rulerOn) {
  await evaluate('window.__go(0)'); await sleep(800);
  await evaluate(`window.__ys = []; (function f(){ window.__ys.push(scrollY); if (window.__ys.length < 150) requestAnimationFrame(f); })()`);
  for (let i = 0; i < 6; i++) { await cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: 100 }); await sleep(60); }
  await sleep(2600);
  const ys = await evaluate('window.__ys');
  const steps = ys.slice(1).map((y, i) => y - ys[i]).filter((d) => d !== 0);
  console.log(`rueda: 6×100 px → recorrido ${ys.at(-1) - ys[0]} px en ${steps.length} fotogramas con movimiento; paso máx ${Math.max(...steps).toFixed(1)} px`);
}

// Final de página
await evaluate('window.__go(document.documentElement.scrollHeight)');
await sleep(1500);
await shot('99-final');

// Prueba del salto por clic en la pila: clic en el título de la primera sección
const before = await evaluate('scrollY');
await evaluate(`document.querySelector('.ruler-word[data-i="0"] .ruler-letter')?.click()`);
await sleep(2200);
const after = await evaluate('scrollY');
console.log(`salto por clic: scrollY ${before} → ${after}`);

// Mapa al pasar el ratón por la regla + tema oscuro
const e2 = info.secs.find((x) => x.id === 'resultados');
if (e2) {
  await evaluate(`window.__go(${e2.top - 64})`);
  await sleep(1400);
  await shot('10-etapa');
  if (info.rulerOn) {
    await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W - 30, y: Math.round(H / 2) });
    await sleep(700);
    await shot('11-mapa');
    await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(W / 2), y: Math.round(H / 2) });
    await sleep(400);
  }
  // Visor de figuras: pulsa un botón de figura y comprueba que el diálogo se abre
  await evaluate(`document.querySelector('[data-figure]')?.click()`);
  await sleep(900);
  const dialogOpen = await evaluate(`document.getElementById('lightbox')?.open === true`);
  console.log('visor de figuras: ' + (dialogOpen ? 'OK (abre)' : 'FALLA (no abre)'));
  if (!dialogOpen) problems.push('el visor de figuras no se abrió al pulsar un botón [data-figure]');
  await shot('12-visor');
  await evaluate(`document.getElementById('lightbox')?.close()`);
  await evaluate('window.__go(0)');
  await sleep(600);
}

// Accesibilidad y animaciones añadidas (texto partido, índice, foco, cifras, islas, MAE, explorador)
const a11y = (await evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const h1 = document.querySelector('.hero-title');
  const sr = h1.querySelector('.sr-only');
  const chars = [...h1.querySelectorAll('.ch')];
  const out = {
    split: chars.length > 0,
    charsHidden: chars.every(c => c.getAttribute('aria-hidden') === 'true'),
    srText: sr ? sr.textContent.trim() : null,
    words: document.querySelectorAll('.word').length,
  };
  const btn = document.getElementById('nav-index');
  const panel = document.getElementById('indice');
  btn.click(); await wait(120);
  out.indexOpen = !panel.hidden && btn.getAttribute('aria-expanded') === 'true' && document.activeElement === panel.querySelector('a');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(120);
  out.indexClosed = panel.hidden && document.activeElement === btn;
  const skip = document.querySelector('.skip');
  skip.focus(); skip.click(); await wait(700);
  out.skipFocus = document.activeElement === document.getElementById('contenido');
  // inicio sin figuras; Método: clic fija el panel y saca la isla «Ver más», otro clic la quita
  out.heroClean = !document.querySelector('.process-card [data-figure]');
  const fstep = document.querySelectorAll('#metodo .flow-step')[1];
  const island = document.querySelector('#metodo [data-island]');
  fstep.click(); await wait(150);
  const pinnedOk = !island.hidden && /fig03_protocolo/.test(island.getAttribute('data-figure') || '') && fstep.getAttribute('aria-pressed') === 'true';
  island.click(); await wait(150);
  const lbOk = document.getElementById('lightbox').open && /fig03_protocolo/.test(document.getElementById('lightbox-img').getAttribute('src') || '');
  document.getElementById('lightbox').close(); await wait(100);
  fstep.click(); await wait(150);
  out.islands = out.heroClean && pinnedOk && lbOk && island.hidden;
  // Resultados: pestaña Entrenamiento + orden → XGBoost primero (3,52); en Prueba ordenado → LSTM (4,14)
  const mae = document.querySelector('[data-mae]');
  mae.querySelector('[data-mode="train"]').click(); mae.querySelector('[data-sort]').click(); await wait(60);
  const firstTrain = mae.querySelector('.mae-row .mae-name').textContent.trim();
  mae.querySelector('[data-mode="test"]').click(); await wait(60);
  const firstTest = mae.querySelector('.mae-row .mae-name').textContent.trim();
  mae.querySelector('[data-sort]').click();
  out.mae = mae.dataset.mode === 'test' && firstTrain.startsWith('XGBoost') && firstTest === 'LSTM';
  // Problema: la serie dibuja, el periodo «Año de prueba» y el año 2024 cambian la vista y su conclusión
  const serie = document.querySelector('[data-serie]');
  const serieDrawn = !!serie.querySelector('.chart-svg .ln');
  serie.querySelector('[data-range="test"]').click(); await wait(40);
  const sTest = serie.querySelector('[data-serie-insight]').textContent;
  [...serie.querySelectorAll('.yr')].find(b => b.textContent.includes('2024')).click(); await wait(40);
  const s2024 = serie.querySelector('[data-serie-insight]').textContent;
  serie.querySelector('[data-range="all"]').click();
  const dl = document.querySelector('a[download]');
  // en file:// Chrome bloquea fetch: ahí basta con el enlace (la existencia se comprueba por http)
  const pdf = !!dl && (location.protocol === 'file:' || await fetch(dl.getAttribute('href'), { method: 'HEAD' }).then(r => r.ok).catch(() => false));
  out.serie = serieDrawn && serie.querySelectorAll('.yr').length === 10 && sTest.includes('17 emergencias') && s2024.includes('Media de 2024: 20,2')
    && /modelo-analitico-y-predictivo\.pdf$/.test(dl.getAttribute('href')) && dl.getAttribute('download') === 'Modelo analítico y predictivo.pdf' && pdf;
  // Cierre: GitHub y LinkedIn enlazan fuera; Ángel y Victoria abren su tarjeta con correo y teléfono
  const pills = [...document.querySelectorAll('.social ul a, .social ul button')];
  const gh = pills.find(x => x.textContent.includes('Germán'));
  const li = pills.find(x => x.textContent.includes('Sebastián'));
  let popsOk = true;
  for (const who of ['Ángel', 'Victoria']) {
    const b = pills.find(x => x.textContent.includes(who));
    b.click(); await wait(80);
    const pop = document.getElementById(b.getAttribute('popovertarget'));
    popsOk = popsOk && pop.matches(':popover-open') && /^mailto:[^@]+@/.test(pop.querySelector('a[href^="mailto:"]').getAttribute('href')) && !!pop.querySelector('a[href^="tel:+57"]') && !!pop.querySelector('[data-copy]');
    pop.hidePopover();
  }
  out.contacto = gh.getAttribute('href') === 'https://github.com/Gdearmascasta' && gh.target === '_blank'
    && li.getAttribute('href') === 'https://www.linkedin.com/in/sebastian-henrique-delgado-solano-295512264/' && popsOk
    && document.querySelectorAll('.badge-contact a[href^="tel:+57"]').length === 4;
  // Impacto: cada pestaña dibuja; el deslizador cambia la conclusión (p₀ = 6 % → la reserva)
  const exp = document.querySelector('[data-explorer]');
  let drawn = 0;
  for (const t of exp.querySelectorAll('[data-chart]')) { t.click(); await wait(40); if (exp.querySelector('.chart-svg .data').children.length) drawn++; }
  const range = exp.querySelector('.slider input');
  range.value = '6'; range.dispatchEvent(new Event('input', { bubbles: true }));
  const insight6 = exp.querySelector('[data-exp-insight]').textContent;
  range.value = '1'; range.dispatchEvent(new Event('input', { bubbles: true }));
  const insight1 = exp.querySelector('[data-exp-insight]').textContent;
  exp.querySelector('[data-chart="marginal"]').click();
  out.explorer = drawn === 5 && insight6.includes('la reserva (') && /capacidad por pronóstico/.test(insight1) && !document.querySelector('.fig-preview');
  const lis = [...document.querySelectorAll('.process-steps li')];
  lis[3].dispatchEvent(new PointerEvent('pointerenter')); await wait(150);
  const shown = [...document.querySelectorAll('.process-card [data-tech-panel]')].filter(p => !p.hidden);
  out.stage = shown.length === 1 && lis[3].classList.contains('is-active') && shown[0].querySelector('.tech-name').textContent === lis[3].querySelector('.name').textContent;
  const steps = [...document.querySelectorAll('#metodo .flow-step')];
  steps[2].dispatchEvent(new PointerEvent('pointerenter')); await wait(150);
  const mshown = [...document.querySelectorAll('#metodo [data-tech-panel]')].filter(p => !p.hidden);
  out.stage = out.stage && mshown.length === 1 && steps[2].classList.contains('is-current') && mshown[0].querySelector('.tech-name').textContent === steps[2].querySelector('span').textContent;
  return out;
})()`)) || {};
console.log('texto partido:', a11y.split ? 'OK' : 'FALLA', '| caracteres ocultos:', a11y.charsHidden ? 'OK' : 'FALLA', '| copia accesible:', a11y.srText);
console.log('palabras partidas:', a11y.words, '| índice abre/cierra:', a11y.indexOpen && a11y.indexClosed ? 'OK' : 'FALLA', '| foco del skip:', a11y.skipFocus ? 'OK' : 'FALLA', '| escenario:', a11y.stage ? 'OK' : 'FALLA', '| islas:', a11y.islands ? 'OK' : 'FALLA', '| MAE:', a11y.mae ? 'OK' : 'FALLA', '| explorador:', a11y.explorer ? 'OK' : 'FALLA', '| serie y descarga:', a11y.serie ? 'OK' : 'FALLA', '| contacto:', a11y.contacto ? 'OK' : 'FALLA');
if (!a11y.split || !a11y.charsHidden || a11y.srText !== 'De la reacción a la predicción.' || !a11y.indexOpen || !a11y.indexClosed || !a11y.skipFocus || !a11y.islands || !a11y.mae || !a11y.explorer || !a11y.serie || !a11y.contacto || !a11y.stage) problems.push('las comprobaciones de accesibilidad, escenarios, islas, MAE o explorador fallaron');

// Texto que se queda invisible (revelados que no terminaron) en el viewport actual
const hidden = await evaluate(`[...document.querySelectorAll('[data-reveal],[data-intro]')].filter(n => { const r = n.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && getComputedStyle(n).opacity === '0'; }).length`);
console.log('elementos visibles con opacidad 0:', hidden);

console.log(problems.length ? '\nPROBLEMAS:\n' + problems.join('\n') : '\nSin errores de consola');
ws.close(); chrome.kill();
await sleep(500);
try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
process.exit(problems.length ? 1 : 0);
