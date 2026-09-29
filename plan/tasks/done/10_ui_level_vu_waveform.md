# 10 · UI de Level, VU meter y waveform en vivo

**Estado:** ✅ Terminada
**Fase:** 3 — Captura y monitoreo · **Depende de:** 04, 09 · **Doc:** [§4.2, §4.3](../../PROMPT_rebecca_listen.md) · **Ref:** `images/12_main_window_recording.png`

## Objetivo
El slider Level controla la ganancia en tiempo real, el VU meter estéreo muestra el nivel con colores y peak hold, y la waveform se desplaza en vivo; todo funciona ya en estado Ready.

## Pasos

### Paso 1 — Level
- [x] `LevelSlider`: 0–200 %, 100 % en el centro, azul `#1E7BC4`; doble clic resetea a 100 %
- [x] Envía `level:set` con throttle (~30 Hz) y muestra el % en tooltip

### Paso 2 — VU meter
- [x] Dos filas L/R de 40 segmentos; verde hasta −12 dBFS, amarillo hasta −3 dBFS, rojo encima (umbrales en `defaults.ts`)
- [x] Peak hold de 1 s con caída lenta; fuente mono → ambas filas iguales
- [x] Render en canvas o con divs memoizados (sin re-render de React a 30 fps por segmento)

### Paso 3 — Waveform
- [x] `Waveform` en `<canvas>` con `requestAnimationFrame`: buffer circular de columnas, scroll continuo de derecha a izquierda, relleno azul espejado sobre la línea central, rejilla gris tenue
- [x] Escalado por `devicePixelRatio` y redimensionado con `ResizeObserver`
- [x] Método `freeze()` para el estado de pausa (se usa en 13)

### Paso 4 — Verificación
- [x] Con música sonando en Ready: el VU se mueve, los picos se quedan 1 s, la waveform avanza fluida
- [x] Subir el Level a 200 % hace que el VU llegue al rojo; doble clic lo devuelve a 100 %
- [x] DevTools > Performance: sin tirones ni fugas tras 2 min
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [x] Commit: `feat(ui): level, vu meter y waveform en vivo`
- [x] **Cierre de Fase 3**

## Criterios de aceptación
- [x] VU meter y waveform reaccionan al audio real en estado Ready
- [x] El Level altera la señal en tiempo real y se resetea con doble clic
- [x] La animación es fluida (≈60 fps de dibujo, datos a 30 fps)

## Bitácora
- 2026-09-29 — `freeze()` es la prop `frozen` de `Waveform` (ignora frames y para el scroll); VU y waveform reciben una `subscribe` y guardan los frames en refs, React no re-renderiza.
- 2026-09-29 — Scroll suave: las 2 columnas de cada frame entran desde la derecha en 33 ms (rAF a 60 Hz); medido 119,9 px/s (esperado 120), paso de 1–3 px por frame.
- 2026-09-29 — Nuevo `level:get`: el slider arranca con el Level guardado. Sin frames durante `METER_STALE_MS` el VU cae a silencio (p. ej. «mixed», sin dispositivo hasta la 16).
- 2026-09-29 — Verificado con tono 1 kHz a −6 dBFS: 200 % → rojo, doble clic → 100 %; pico retenido 1 s y cae a 20 dB/s; 2 min a 60 fps sin frames largos, heap 12,07→12,08 MB tras GC. rAF se pausa si la ventana está tapada: esperado.
