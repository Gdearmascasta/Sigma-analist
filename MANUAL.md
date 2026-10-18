# Manual de la página Sigma Analist

Página de una sola vista que presenta el proyecto de grado **«Modelo analítico para la
caracterización y predicción de la demanda de emergencias en la red de distribución de gas
natural de Montería, Colombia. Caso de estudio: Surtigas»** (Universidad Tecnológica de
Bolívar, Ingeniería Industrial, 2026). Reutiliza los estilos y las animaciones de la demo
**[creinnova-demo](../creinnova-demo/)**, con la paleta de Creinnova intacta.

## 1. Cómo abrirla

Sitio estático, sin paso de compilación.

```bash
cd ~/Documentos/"sigma analist"
python3 -m http.server 8766
```

Después se abre `http://127.0.0.1:8766/`. También funciona abriendo `index.html` con doble
clic (los scripts son clásicos y las librerías están en `vendor/`).

Las fuentes (Fraunces e Inter) se cargan desde Google Fonts sin bloquear la página. Sin
conexión se usa Georgia y la fuente del sistema como respaldo.

## 2. Estructura de archivos

| Ruta | Contenido |
|---|---|
| `index.html` | Marcado: navegación, ocho secciones, cierre con descarga y pie. |
| `css/styles.css` | Tokens de color, retícula, componentes y el instrumento de scroll. |
| `js/ruler.js` | Motor de la regla lateral y del índice vivo de secciones. Sin dependencias. |
| `js/smooth.js` | Scroll suave con inercia (Lenis), sincronizado con el reloj de GSAP. |
| `js/main.js` | Revelados con GSAP, intro del hero, menú móvil, visor de figuras y anclas internas. |
| `vendor/` | GSAP 3.12.5, ScrollTrigger 3.12.5 y Lenis 1.1.13 (copias locales). |
| `assets/paper-v3_15.pdf` | El paper (versión v3_15, dos columnas) que descarga el botón. |
| `assets/figuras/` | Figuras del paper usadas en la página. |
| `assets/favicon.svg` | Marca «Σ» del sitio. |
| `tools/contrast.mjs` | Comprobación de contraste WCAG de los pares de color. |
| `tools/verify.mjs` | Verificación visual con Chrome real (capturas, consola, interacción). |

## 3. Qué se reutiliza de Creinnova

Se conservan, sin cambios, la paleta, las tipografías y la retícula,
la **regla lateral** con sus estados (cola, viaje, giro, actual, pila), el scroll suave con
Lenis y la coreografía de revelados (`data-choreo`, `data-reveal`, `data-reveal-group`,
`data-intro`). El detalle del modelo de scroll está documentado en el manual de Creinnova
(`creinnova-demo/MANUAL.md`, secciones 5 y 6).

Cambios respecto a la demo de Creinnova:

- El logo y la marca son propios (`Σ` dibujado en CSS; favicon SVG). No se usa el PNG de Creinnova.
- Se quitó todo lo que no aplica a un portafolio: los diálogos de acceso e inscripción y el
  aviso flotante (`toast`), con su CSS.
- Se quitó el tema oscuro: la página usa solo el tema claro de Creinnova.
- Se añadieron componentes nuevos: figuras del paper (`.paper-figure`), cifras destacadas
  (`.stats`/`.stat`), datos de contacto en las tarjetas del equipo (`.badge-mail`), botones
  que abren una figura ampliada (`.flow-step`, `.fig-btn`, `.process-steps button`) y el
  visor a pantalla completa (`<dialog class="lightbox">`).
- El botón de descarga del paper aparece solo al final del recorrido (sección de cierre).

## 4. Secciones

Ocho, en este orden. Cada `section` lleva `data-section` y `data-label`, así entra sola en
el índice lateral.

| # | `id` | `data-label` | Contenido |
|---|---|---|---|
| 1 | `inicio` | Inicio | Hero: título, resumen, CTAs y la tarjeta con las 7 técnicas. |
| 2 | `problema` | Problema | El despacho reactivo y la brecha en la literatura. |
| 3 | `pregunta` | Pregunta | La pregunta de investigación y el marco CRISP-ML(Q). |
| 4 | `metodo` | Método | Datos, diseño y evaluación como botones que abren su figura; protocolo sin fugas. |
| 5 | `resultados` | Resultados | MAE de prueba, comparación y matrices de confusión. |
| 6 | `impacto` | Impacto | Botones con las figuras financieras: horas, sector, equilibrio, caja e incumplimiento. |
| 7 | `equipo` | Equipo | Las cuatro tarjetas con formación, rol, frente y correo. |
| 8 | `cierre` | Cierre | Descarga del paper, contacto y pie. |

## 5. Contenido y cifras

Todas las cifras salen del paper v3_15 (fuente en
`~/Documentos/Proyecto/referencias_edwin/paper/`) y de sus macros (`resultados_macros.tex`).
Las principales que aparecen en la página:

| Cifra | Valor | Dónde |
|---|---|---|
| Registros | 50 195 (2017–2026) | Inicio, Problema |
| MAE de prueba (XGBoost W=40) | 4,22 emergencias por día | Resultados |
| Reducción frente a la mejor referencia | 34 % (6,40 → 4,22) | Inicio, Resultados |
| Varianza del error explicada por la técnica | 59 % | Resultados |
| Horas de dotación mal dimensionada ahorradas | 1 468 h/año | Impacto |
| Reducción de horas en déficit por sector | 24 % | Impacto |
| Umbral de probabilidad de multa para la reserva | 3,2 % | Impacto |

Si el paper se recompila y alguna cifra cambia, hay que actualizar el texto en `index.html`
a mano (los números están escritos en el HTML, no se leen de un JSON).

## 6. Cómo añadir o cambiar una sección

Cualquier `section` con `data-section` y `data-label` entra en el índice. El color del
título sale de `data-ink`. Etiquetas de una palabra y 10 letras como máximo.

```html
<section class="section" id="nueva" data-section data-label="Nueva"
         data-ink="var(--s6-ink)" data-choreo>
  <span class="draw-rule" data-draw-rule aria-hidden="true"></span>
  <span class="draw-tick tl" data-draw-tick aria-hidden="true"></span>
  <span class="draw-tick tr" data-draw-tick aria-hidden="true"></span>
  <div class="wrap">…</div>
</section>
```

Para el color por sección se reutiliza la paleta de Creinnova: naranja, amarillo, verde,
azul, rojo, morado y cian (`--s1`…`--s7`), con sus tintas para texto (`--s1-ink`…).

## 7. Accesibilidad

Menú móvil con `aria-expanded`, skip link, foco visible, `prefers-reduced-motion` respetado,
figuras con texto alternativo y contraste verificado con el script incluido (texto normal a
4,5:1 y texto grande a 3:1).

## 8. Verificación

```bash
node tools/contrast.mjs                                   # 37/37 pares cumplen WCAG AA
node tools/verify.mjs http://127.0.0.1:8766/ salida 1440 900
node tools/verify.mjs http://127.0.0.1:8766/ salida 390 844
```

`tools/verify.mjs` abre la página con Chrome real y comprueba el título más ancho, el ajuste
automático del giro, la fluidez de la rueda, el salto por clic y los errores de consola.
Acepta las variables `SCHEME` (tema del sistema emulado), `WAIT` y `CHROME` (binario del
navegador, por defecto `google-chrome`).

## 9. Limitaciones y pendientes

- **Sin servidor.** La descarga del paper y los correos funcionan; no hay backend.
- **La versión del paper descargable es v3_15 (dos columnas).** Para cambiarla, sustituye
  `assets/paper-v3_15.pdf` y el `href` de los botones.
- **Figuras.** `v30_equilibrio.png` es vertical y se limita a 520 px de alto; el resto se
  muestran a ancho completo.
- **Imagen social.** `og:image` es relativa; al publicar conviene una URL absoluta.
- **Navegadores.** Se verificó en Chrome. Falta probar Firefox y Safari (`color-mix()` y
  `backdrop-filter` se usan en el índice lateral y la navegación).
- **Marca.** «Sigma Analist» es el nombre de la carpeta; si el equipo tiene otro nombre, se
  cambia en la cabecera, el cierre y el `<title>`.
