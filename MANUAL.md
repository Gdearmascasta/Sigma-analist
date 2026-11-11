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
| `js/main.js` | Revelados con GSAP, intro del hero, escenarios ilustrados, barras del MAE, visor de figuras y anclas internas. |
| `js/charts.js` | Explorador interactivo de las cinco figuras de Impacto (SVG propio, sin librerías). |
| `vendor/` | GSAP 3.12.5, ScrollTrigger 3.12.5 y Lenis 1.1.13 (copias locales). |
| `assets/modelo-analitico-y-predictivo.pdf` | El paper v3.36 (una columna) que descarga el botón; se guarda como «Modelo analítico y predictivo.pdf». |
| `js/serie-diaria.js` | Datos de la serie de la Fig. 6 (media móvil de 30 días, medias anuales, partición) para la gráfica de Problema. |
| `assets/figuras/` | Figuras del paper usadas en la página. |
| `assets/favicon.svg` | Marca «Σ» del sitio. |
| `assets/og-card.png` | Tarjeta social 1200×630 que usan `og:image` y `twitter:image`. |
| `tools/contrast.mjs` | Comprobación de contraste WCAG de los pares de color. |
| `tools/verify.mjs` | Verificación visual con Chrome real (capturas, consola, interacción). |
| `tools/og-card.mjs` + `tools/og-card.html` | Regeneran `assets/og-card.png` desde una tarjeta HTML. |

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
- El menú móvil de Creinnova (tres enlaces tras un burger) se sustituyó por un **índice
  único** con las ocho secciones, igual en todos los tamaños y alcanzable por teclado.

## 3 bis. Movimiento (revisión de animejs.com)

Se tomaron las ideas de animación que encajan con una página de proyecto de grado; se
descartaron el hero WebGL y los paneles fijados. Todo se apaga con `prefers-reduced-motion`.

| Pieza | Qué hace | Dónde |
|---|---|---|
| `[data-split]` | El titular se parte por caracteres y entra letra a letra. Los caracteres van `aria-hidden` y una copia `.sr-only` conserva el texto legible. Cada palabra va en un `.wd` sin cortes, y el punto final es `.hang` (puntuación colgada) para que no caiga solo en otra línea. | `h1` del hero |
| `[data-words]` | Los títulos de sección entran palabra a palabra (el texto del DOM no cambia). | los siete títulos |
| `.stat b` | Las cifras cuentan de 0 a su valor real y terminan con el texto exacto del HTML. | Resultados e Impacto |
| `.flow-step.is-active` | Los tres bloques del método se activan en orden al recorrer la sección. | Método |
| `[data-figure]` | Abre el visor con la figura original del paper. Ya no hay vista previa al pasar el ratón: solo lo llevan las islas. | Método, Resultados, Impacto |
| `.island` | Botón de isla (familia de las fichas de autores) que abre la figura original: «Ver más» en Método aparece solo al fijar un bloque; «Ver original» en Resultados e Impacto. | Método, Resultados, Impacto |
| `[data-mae]` | Barras del MAE de las 9 técnicas con pestañas Prueba / Entrenamiento / Comparar y «Ordenar por error» (reordenado FLIP). Las barras vienen en el HTML: sin JS se ve la vista de prueba. | Resultados |
| `[data-serie]` | Serie diaria de Problema (Fig. 6): área de la media móvil de 30 días con periodo (todo, desde 2023, año de prueba), barras de medias anuales que hacen zoom a su año, bandas de la partición y pico diario marcado. | Problema |
| `[data-explorer]` | Explorador de Impacto: 5 pestañas, subvistas, leyenda que activa o desactiva series, tooltip con guía (ratón y flechas), deslizador de p₀ y tabla `.sr-only` por vista. Datos del paper v3.36: etiquetas de las figuras 23 a 27 y cuadros 17 a 21. | Impacto |
| `[data-tech-stage]` | Escenario de las 7 técnicas: ilustración SVG propia de cada una (las de conteo salen de su distribución real) cuyos trazos se dibujan. Señalar o enfocar una técnica la muestra y un clic la fija (otro clic la suelta); sin interacción pasa sola cada 4,5 s, con una barra de tiempo, y se pausa con el puntero o el foco encima, fuera de pantalla o con la pestaña oculta. Con movimiento reducido no hay pase ni trazos. Los SVG se generaron con un script y van en línea en `index.html`. | hero |
| `[data-tech-stage].is-wide` | Mismo componente en Método: recreaciones SVG de las tres figuras del paper (flujo de datos, protocolo y prueba) que se activan con los bloques `.flow-step` (clase `is-current`). Fichas que recorren su ruta, rejilla del factorial 4×5 que se ilumina una vez por réplica y termina en XGBoost W=40, y barrido de las curvas con cursor. La serie de prueba (1 ene–16 mar 2026) se extrajo de los píxeles de `doe_02_prueba.png`; la figura original sigue a un clic. Cada escenario declara `data-items` y `data-current`. | Método |
| `.hero-glow::after` | La retícula del hero deriva despacio (solo `transform`) y se pausa al salir de pantalla. | hero |
| `.bars` | Las dos barras del MAE (4,22 y 6,40) crecen atadas al scroll (`--p`, suavizado con `quickTo`) y quedan llenas cuando su borde superior llega al 58 % de la pantalla. Se recortan con `clip-path` para no aplastar el extremo redondeado. Sin JS o con movimiento reducido se ven llenas. | Resultados |
| `[data-dot-wave]` | Rejilla de 13×13 puntos que entra desde el centro y se desparrama (dos ejemplos de anime.js juntos). | Resultados |

Sin JS, con GSAP caído o con movimiento reducido, la página queda igual: texto plano, cifras
finales y figuras accesibles por clic.

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

Todas las cifras salen del paper v3.36 (`assets/modelo-analitico-y-predictivo.pdf`), contrastadas
una a una el 10 nov 2026. Las figuras de `assets/figuras/` se recortaron de ese PDF.
Las principales que aparecen en la página:

| Cifra | Valor | Dónde |
|---|---|---|
| Registros | 50 195 (2017–2026) | Inicio, Problema |
| MAE de prueba (XGBoost W=40) | 4,22 emergencias por día | Resultados |
| Reducción frente a la mejor referencia | 34 % (6,40 → 4,22) | Inicio, Resultados |
| Varianza del error explicada por la técnica | 59 % | Resultados |
| Horas de capacidad mal dimensionada ahorradas | 1 468 h/año | Impacto |
| Reducción de horas en déficit por sector | 24 % | Impacto |
| Horas mal dimensionadas hoy (referencia simple) | 3 878 h/año | Problema |
| Reducción de horas mal dimensionadas con el pronóstico | 38 % | Impacto |
| Días críticos (déficit > 5 emergencias) | de 94 a 61 | Impacto |
| Recuperación de la inversión (escenario C) | unos 22 meses; VPN 99,36 M COP | Impacto |
| Cumplimiento actual en no controladas | 99 % en menos de 1 h | Problema |
| Umbral de probabilidad de multa para la reserva | 3 % (v3_15 decía 3,2 %) | Impacto |
| Escenarios simulados | A, C y D (v3.36 retiró B de figuras y cuadros) | Impacto |
| Equilibrio de cuadrillas | entre 3 y 4, se toman 4 (unas 1862 h) | Impacto |

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

Índice de secciones con `aria-expanded` y foco gestionado (abre en el primer enlace, cierra con
Escape y devuelve el foco al botón), `aria-current` en la sección visible, skip link que mueve el
foco al contenido, foco visible, `prefers-reduced-motion` respetado, texto animado con copia
`.sr-only` y caracteres `aria-hidden`, figuras con texto alternativo y contraste verificado con el
script incluido (texto normal a 4,5:1 y texto grande a 3:1).

## 8. Verificación

```bash
node tools/contrast.mjs                                   # 39/39 pares cumplen WCAG AA
node tools/verify.mjs http://127.0.0.1:8766/ salida 1440 900
node tools/verify.mjs http://127.0.0.1:8766/ salida 390 844
node tools/og-card.mjs                                    # regenera assets/og-card.png
```

`tools/verify.mjs` abre la página con Chrome real y comprueba el título más ancho, el ajuste
automático del giro, la fluidez de la rueda, el salto por clic, los errores de consola, el texto
partido (caracteres ocultos y copia accesible), el índice (abre, cierra y devuelve el foco), el
foco del skip link y la vista previa de figuras. Acepta las variables `SCHEME` (tema del sistema
emulado), `WAIT` y `CHROME` (binario del navegador, por defecto `google-chrome`).

## 9. Limitaciones y pendientes

- **Sin servidor.** La descarga del paper y los correos funcionan; no hay backend.
- **La versión del paper descargable es v3.36.** Para cambiarla, sustituye
  `assets/modelo-analitico-y-predictivo.pdf` (el nombre de descarga lo fija el atributo `download`).
- **Figuras.** Las originales se abren en el visor desde las islas «Ver original» / «Ver más»; la de
  matrices de confusión sigue a ancho completo dentro de Resultados.
- **Imagen social.** `og:image` y `twitter:image` apuntan a
  `https://gdearmascasta.github.io/Sigma-analist/assets/og-card.png`. Si el sitio se publica en
  otro dominio hay que cambiar esas dos líneas y `og:url` en `index.html`.
- **Nombres heredados.** `window.CreinnovaRuler` y `window.creinnovaLenis` conservan el nombre de
  la demo original: `tools/verify.mjs` los usa, así que renombrarlos toca también el verificador.
- **Navegadores.** Se verificó en Chrome. Falta probar Firefox y Safari (`color-mix()` y
  `backdrop-filter` se usan en el índice lateral y la navegación).
- **Animaciones.** Con `prefers-reduced-motion: reduce` no se parte el texto ni se cuentan las
  cifras; se comprobó con la emulación de Chrome, no en un lector de pantalla real.
- **Panel fijado.** No se aplicó: el cuerpo de Resultados mide 1414 px (dos figuras), más que la
  pantalla, así que `position: sticky` no tendría recorrido. El efecto lo dan las barras atadas al
  scroll y la onda de puntos. Si se quiere fijar de verdad, hay que sacar las figuras
  del cuerpo y dejarlo por debajo de 900 px.
- **Marca.** «Sigma Analist» es el nombre de la carpeta; si el equipo tiene otro nombre, se
  cambia en la cabecera, el cierre y el `<title>`.
