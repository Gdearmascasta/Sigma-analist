// Genera la tarjeta social (assets/og-card.png, 1200x630) a partir de tools/og-card.html.
// Uso: node tools/og-card.mjs [salida]      (CHROME=chromium para elegir el binario)
// Abre Chrome real, espera a las fuentes y captura la ventana. Sin dependencias.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const W = 1200;
const H = 630;
const out = path.resolve(process.argv[2] || 'assets/og-card.png');
const src = path.resolve('tools/og-card.html');
const port = 9400 + Math.floor(Math.random() * 400);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-og-'));
const bin = process.env.CHROME || process.env.CHROME_BIN || 'google-chrome';

const chrome = spawn(bin, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
chrome.on('error', (err) => { console.error(`No se pudo ejecutar «${bin}»: ${err.message}`); process.exit(2); });

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
}
if (!wsUrl) { console.error(`No se pudo conectar con Chrome («${bin}»)`); chrome.kill(); process.exit(2); }

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
};
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => (await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cmd('Page.navigate', { url: 'file://' + src });
await sleep(1200);
await evaluate('document.fonts.ready.then(() => true)');
await sleep(600);
const shot = await cmd('Page.captureScreenshot', { format: 'png' });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(`${path.relative(process.cwd(), out)} · ${W}x${H} · ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
ws.close(); chrome.kill();
await sleep(400);
try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
