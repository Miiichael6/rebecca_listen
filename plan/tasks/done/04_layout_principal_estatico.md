# 04 · Layout estático de la ventana principal

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** 01, 02 · **Doc:** [§4, §14](../../PROMPT_rebecca_listen.md) · **Ref:** `images/12_main_window_recording.png`

## Objetivo
La ventana principal muestra todo su layout con datos de ejemplo (Source, Level + VU, waveform, cronómetro, barra de estado, lista y transporte), fiel a la captura 12 y con el estilo claro de §14.

## Pasos

### Paso 1 — Estilo global
- [x] Usar CSS Modules (sin dependencias extra; §14 permite elegir) y anotarlo en Bitácora
- [x] `src/renderer/src/assets/theme.css`: variables en `:root` con los colores de §14, Segoe UI 12–13 px, grises de etiquetas. Solo tema claro, como el original (sin modo oscuro; al ir todo por variables, añadirlo después es un bloque de CSS)
- [x] Abrir `images/12_main_window_recording.png` y medir alturas y espaciados de cada franja

### Paso 2 — Componentes de presentación (props con datos falsos)
- [x] `components/SourcePicker` (combo cerrado con el modo actual; el desplegable completo llega en 07)
- [x] `components/LevelSlider` y `components/VuMeter` (2 filas × 40 segmentos, colores por umbral)
- [x] `components/Waveform` (canvas con fondo blanco y rejilla gris tenue)
- [x] `components/Timer` (`MM:SS` grande y monoespaciado)
- [x] `lib/duration.ts` y `lib/vu.ts`: el formato de duración y las cuentas del VU, con tests propios (lógica pura, la usan Timer y RecordingList)
- [x] `lib/waveformPainter.ts`: el dibujo del canvas, separado del componente
- [x] `components/StatusBar` (badge de estado y contador redondo; sin los indicadores AGC · NS · VAS · FLL · Schedule del original, porque esas funciones quedan fuera)
- [x] `components/RecordingList` (filas cebra, nombre + duración, seleccionada con barra azul izquierda, fila en curso `--:--` en azul)
- [x] `components/TransportBar` (botón redondo de grabar, píldora File / Stop / Play / Pause, botón Split, engranaje) con iconos `lucide-react`. Sin barra de progreso de reproducción: ▶ abrirá el archivo en el reproductor del sistema (17)

### Paso 3 — Composición
- [x] `windows/Main/MainWindow.tsx` compone todo; la lista ocupa el alto sobrante y hace scroll
- [x] Textos en inglés directamente en los componentes (sin i18n; ver 01)

### Paso 4 — Verificación
- [x] Comparar lado a lado con `12_main_window_recording.png` a 445×620 y al redimensionar hasta 420×560: nada se desborda
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [x] Commit: `feat(ui): layout estático de la ventana principal`
- [x] **Cierre de Fase 1**

## Criterios de aceptación
- [x] Todas las franjas de §4.1–§4.8 están presentes y se parecen a la captura 12
- [x] Los colores salen de variables CSS, no escritos a mano en los componentes
- [x] El layout es usable en 420×560

## Bitácora
- 2026-09-29 — CSS Modules (sin dependencias nuevas): los tokens viven en `assets/theme.css` (`:root`) y `main.css` solo lo importa y pone el reset. Ningún componente escribe un color a mano, así que el modo oscuro sería un segundo bloque de variables.
- 2026-09-29 — La lógica pura se sacó de los componentes a `renderer/src/lib/` (`duration`, `vu`, `waveformPainter`) para poder testearla con Vitest sin DOM; los componentes solo colocan y pintan.
- 2026-09-29 — La cebra de la lista es un `repeating-linear-gradient` del contenedor, no `nth-child` de las filas: así sigue más allá de la última fila como en el original.
- 2026-09-29 — `VU_SEGMENTS` (40) y `VU_FLOOR_DB` (−60) se añadieron a `shared/defaults.ts`; la spec da los umbrales pero no el suelo de la escala.
- 2026-09-29 — Verificado con la app real por CDP (`npm run dev -- --remote-debugging-port=9222`, con `unset ELECTRON_RUN_AS_NODE`): capturas a 445×589 y 420×529 de contenido y `scrollWidth`/`scrollHeight` iguales a los `client*`, es decir, sin desbordes.
