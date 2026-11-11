# Modelo analítico y predictivo de emergencias de gas

Página web de un proyecto de grado de Ingeniería Industrial de la Universidad Tecnológica de Bolívar (2026). Su título completo es «Modelo analítico para la caracterización y predicción de la demanda de emergencias en la red de distribución de gas natural de Montería, Colombia. Caso de estudio: Surtigas».

## De qué trata

Surtigas atiende las emergencias de su red en Montería de forma reactiva: la cuadrilla sale cuando el usuario ya reportó el incidente. El proyecto entrenó un modelo con 50 195 registros de emergencias (2017-2026) para anticipar cuántas llegarán al día siguiente.

El modelo elegido, XGBoost, se equivocó en promedio 4,22 emergencias por día en el año de prueba, un 34 % menos que el mejor método de referencia. Traducida a tiempo de cuadrilla, esa mejora equivale a unas 1468 horas anuales menos de capacidad mal dimensionada.

## Qué muestra la página

El recorrido sigue el orden del paper: el problema, la pregunta de investigación, el método, los resultados, el impacto operativo y financiero, el equipo y la descarga del documento. Las figuras del paper se presentan como gráficos interactivos, y cada uno permite abrir la figura original.



## Estructura

- `index.html`: contenido de la página.
- `css/styles.css`: estilos y paleta.
- `js/`: animaciones, gráficos interactivos y datos de la serie diaria.
- `assets/`: figuras del paper y el documento en PDF.
- `tools/`: comprobaciones de contraste y de funcionamiento en Chrome.

El detalle técnico (componentes, cifras, fuentes de los datos y pendientes) está en [MANUAL.md](MANUAL.md).

## Equipo

Germán De Armas, Ángel Vega, Sebastián Delgado y Victoria Ripoll, con la asesoría de la PhD. Jenifer Yoris Vasquez Aguilar.
