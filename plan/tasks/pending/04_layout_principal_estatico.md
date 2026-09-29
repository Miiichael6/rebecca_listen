# 04 · Layout estático de la ventana principal

**Estado:** ⬜ Pendiente
**Fase:** 1 — Base · **Depende de:** 01, 02 · **Doc:** [§4, §14](../../PROMPT_rebecca_listen.md) · **Ref:** `images/12_main_window_recording.png`

## Objetivo
La ventana principal muestra todo su layout con datos de ejemplo (Source, Level + VU, waveform, cronómetro, barra de estado, lista y transporte), fiel a la captura 12 y con el estilo claro de §14.

## Pasos

### Paso 1 — Estilo global
- [ ] Usar CSS Modules (sin dependencias extra; §14 permite elegir) y anotarlo en Bitácora
- [ ] `src/renderer/src/assets/theme.css`: variables en `:root` con los colores de §14, Segoe UI 12–13 px, grises de etiquetas. Solo tema claro, como el original (sin modo oscuro; al ir todo por variables, añadirlo después es un bloque de CSS)
- [ ] Abrir `images/12_main_window_recording.png` y medir alturas y espaciados de cada franja

### Paso 2 — Componentes de presentación (props con datos falsos)
- [ ] `components/SourcePicker` (combo cerrado con el modo actual; el desplegable completo llega en 07)
- [ ] `components/LevelSlider` y `components/VuMeter` (2 filas × 40 segmentos, colores por umbral)
- [ ] `components/Waveform` (canvas con fondo blanco y rejilla gris tenue)
- [ ] `components/Timer` (`MM:SS` grande y monoespaciado)
- [ ] `components/StatusBar` (badge de estado y contador redondo; sin los indicadores AGC · NS · VAS · FLL · Schedule del original, porque esas funciones quedan fuera)
- [ ] `components/RecordingList` (filas cebra, nombre + duración, seleccionada con barra azul izquierda, fila en curso `--:--` en azul)
- [ ] `components/TransportBar` (botón redondo de grabar, píldora File / Stop / Play / Pause, botón Split, engranaje) con iconos `lucide-react`. Sin barra de progreso de reproducción: ▶ abrirá el archivo en el reproductor del sistema (17)

### Paso 3 — Composición
- [ ] `windows/Main/MainWindow.tsx` compone todo; la lista ocupa el alto sobrante y hace scroll
- [ ] Textos en inglés directamente en los componentes (sin i18n; ver 01)

### Paso 4 — Verificación
- [ ] Comparar lado a lado con `12_main_window_recording.png` a 445×620 y al redimensionar hasta 420×560: nada se desborda
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [ ] Commit: `feat(ui): layout estático de la ventana principal`
- [ ] **Cierre de Fase 1**

## Criterios de aceptación
- [ ] Todas las franjas de §4.1–§4.8 están presentes y se parecen a la captura 12
- [ ] Los colores salen de variables CSS, no escritos a mano en los componentes
- [ ] El layout es usable en 420×560

## Bitácora
- _(fecha — nota)_
