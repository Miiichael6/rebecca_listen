# 09 · DSP base: gain, meter, waveform y monitoreo

**Estado:** ✅ Terminada
**Fase:** 3 — Captura y monitoreo · **Depende de:** 08 · **Doc:** [§2.1, §4.2, §4.3, §12.6](../../PROMPT_rebecca_listen.md)

## Objetivo
Main tiene los módulos DSP puros `gain`, `meter` y `waveform`, y un pipeline de monitoreo que, en estado Ready, abre el source seleccionado y envía al renderer frames de nivel y picos a 30 fps.

## Pasos

### Paso 1 — Módulos puros (`src/main/audio/dsp/`)
- [x] `gain.ts`: `applyGain(frames, gainLinear)` con rampa suave entre valores (sin clics); `percentToLinear(0..200)`
- [x] `meter.ts`: RMS y pico por canal en dBFS (`-Infinity` → piso −90 dB); acumula y emite cada `1000 / METER_FPS` ms
- [x] `waveform.ts`: decimación a pares min/max por columna para 30 fps
- [x] Utilidades de test `src/main/audio/dsp/testSignals.ts`: `sine(freq, amp, secs, rate, ch)`, `silence()`, `whiteNoise(seed)`

### Paso 2 — Pipeline de monitoreo
- [x] `src/main/audio/pipeline.ts`: cadena `stream → gain → meter → waveform` (resampler, mixer y encoder se enchufan en tareas posteriores; dejar los puntos de inserción)
- [x] `src/main/audio/monitor.ts`: abre el source al arrancar y al cambiarlo; se cierra al cambiar de dispositivo o si este se pierde
- [x] Envío `meter:frame` y `wave:frame` con `webContents.send` solo si la ventana está visible (ahorra CPU en bandeja): con la ventana oculta o minimizada el stream se cierra del todo (`windowVisibility.ts`, compartido con el sondeo)
- [x] Handler `level:set` (persistido en settings)
- [x] `src/main/audio/ticker.ts`: temporizador que mantiene 30 fps de media (`setInterval(33)` daba ~27 en Windows), con test

### Paso 3 — Tests
- [x] `gain.test.ts`: 100 % no cambia la señal, 200 % = +6.02 dB, 0 % = silencio, sin saltos en la rampa
- [x] `meter.test.ts`: seno amplitud 1 → RMS −3.01 dBFS y pico 0 dBFS; silencio → piso; estéreo con canales distintos
- [x] `waveform.test.ts`: número de columnas correcto y min/max exactos sobre señal conocida

### Paso 4 — Verificación
- [x] Con música sonando y la app en Ready, los frames llegan al renderer (log en DevTools) a ~30 por segundo
- [x] Cambiar el Level con `window.api` altera los valores del meter
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(dsp): gain, meter, waveform y monitoreo en ready`

## Criterios de aceptación
- [x] Los módulos DSP son funciones puras con tests sobre seno, silencio y ruido
- [x] El monitoreo funciona sin grabar
- [x] La carga de CPU del monitoreo es baja (anotar % en Bitácora)

## Bitácora
- 2026-09-29 — El monitor abre su propio stream; la sesión sigue abriendo otro (dos clientes WASAPI en el mismo endpoint, probado grabando mientras se monitorea). Por eso el Level aún no afecta al archivo: la 13 cuelga el encoder del pipeline (punto marcado en `pipeline.ts`) y deja un solo stream.
- 2026-09-29 — Verificado por CDP con tono de 1 kHz a 0.25: −15.05 RMS / −12.04 pico dBFS; 200 % → +6.02 dB, 50 % → −6.02 dB; silencio → −90; 30 frames/s de meter y de wave (2 columnas por frame).
- 2026-09-29 — CPU (16 núcleos, % de un núcleo): main ~2 %, sidecar ~1–1.7 %, renderer ~0.5 % monitoreando; minimizada, 0 % en todos (el stream se cierra).
- 2026-09-29 — No hay `level:get`: el renderer no puede leer el Level guardado al arrancar; lo necesitará la 10 (añadir el canal o incluirlo en `settings:get`).
- 2026-09-29 — Pérdida del dispositivo sin probar con hardware (como en 08): el `onError` del stream cierra y re-resuelve el source; cubierto solo por lectura de código.
