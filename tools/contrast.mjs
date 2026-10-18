// Verifica el contraste WCAG 2.x de los pares de color que usa la demo.
// Uso: node tools/contrast.mjs   (sale con código 1 si algún par no cumple)
// Los valores deben coincidir con los tokens de css/styles.css.

const hex = (h) => {
  const n = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
};
const lum = (h) => {
  const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const bg = '#fefaf3';
const card = '#ffffff';

// [nombre, texto, fondo, mínimo]  4.5 = texto normal, 3 = texto grande / UI
const pairs = [
  ['texto principal', '#190f0a', bg, 4.5],
  ['texto secundario', '#695b50', bg, 4.5],
  ['texto secundario en tarjeta', '#695b50', card, 4.5],
  ['título: «situación» (texto grande)', '#f94144', bg, 3],
  ['título: «solución» (texto grande)', '#2f9a3c', bg, 3],
  ['texto tenue (rótulos)', '#75665a', bg, 4.5],
  ['acento naranja (texto)', '#b4550a', bg, 4.5],
  ['texto sobre botón primario', '#fefaf3', '#291508', 4.5],
  // el botón con degradado usa texto de 19 px en negrita (texto grande): mínimo 3:1
  ['botón degradado (inicio)', '#ffffff', '#e06c12', 3],
  ['botón degradado (medio)', '#ffffff', '#f94144', 3],
  ['botón degradado (final)', '#ffffff', '#9e45b1', 3],
  ['etapa 1 tinta', '#1263c4', bg, 4.5],
  ['etapa 2 tinta', '#007a64', bg, 4.5],
  ['etapa 3 tinta', '#2c7a33', bg, 4.5],
  ['etapa 4 tinta', '#8a6a00', bg, 4.5],
  ['etapa 5 tinta', '#c4262a', bg, 4.5],
  ['etapa 6 tinta', '#7a3bb8', bg, 4.5],
  ['etapa 7 tinta', '#00788a', bg, 4.5],
  ['número sobre círculo etapa 4', '#190f0a', '#eebd00', 4.5],
  ['número sobre círculo etapa 1', '#ffffff', '#1d6fd6', 4.5],
  ['número sobre círculo etapa 2', '#190f0a', '#00b393', 4.5],
  ['número sobre círculo etapa 3', '#190f0a', '#45ba50', 4.5],
  ['número sobre círculo etapa 5', '#190f0a', '#f94144', 4.5],
  ['número sobre círculo etapa 6', '#ffffff', '#8a48cc', 4.5],
  ['número sobre círculo etapa 7', '#190f0a', '#00acc1', 4.5],
  ['texto en botón de figura', '#190f0a', card, 4.5],
  ['leyenda del visor de figuras', '#f9f4ee', '#190f0a', 4.5],
];

let fail = 0;
for (const [name, fg, bgc, min] of pairs) {
  const r = ratio(fg, bgc);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${r.toFixed(2).padStart(5)}:1  (mín ${min})  ${name}  ${fg} / ${bgc}`);
}
console.log(fail ? `\n${fail} par(es) no cumplen` : '\nTodos los pares cumplen WCAG AA');
process.exit(fail ? 1 : 0);
