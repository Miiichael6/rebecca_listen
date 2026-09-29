# 09 · DSP base: gain, meter, waveform y monitoreo

**Estado:** ⬜ Pendiente
**Fase:** 3 — Captura y monitoreo · **Depende de:** 08 · **Doc:** [§2.1, §4.2, §4.3, §12.6](../../PROMPT_rebecca_listen.md)

## Objetivo
Main tiene los módulos DSP puros `gain`, `meter` y `waveform`, y un pipeline de monitoreo que, en estado Ready, abre el source seleccionado y envía al renderer frames de nivel y picos a 30 fps.

## Pasos

### Paso 1 — Módulos puros (`src/main/audio/dsp/`)
- [ ] `gain.ts`: `applyGain(frames, gainLinear)` con rampa suave entre valores (sin clics); `percentToLinear(0..200)`
- [ ] `meter.ts`: RMS y pico por canal en dBFS (`-Infinity` → piso −90 dB); acumula y emite cada `1000 / METER_FPS` ms
- [ ] `waveform.ts`: decimación a pares min/max por columna para 30 fps
- [ ] Utilidades de test `src/main/audio/dsp/testSignals.ts`: `sine(freq, amp, secs, rate, ch)`, `silence()`, `whiteNoise(seed)`

### Paso 2 — Pipeline de monitoreo
- [ ] `src/main/audio/pipeline.ts`: cadena `stream → gain → meter → waveform` (resampler, mixer y encoder se enchufan en tareas posteriores; dejar los puntos de inserción)
- [ ] `src/main/audio/monitor.ts`: abre el source al arrancar y al cambiarlo; se cierra al cambiar de dispositivo o si este se pierde
- [ ] Envío `meter:frame` y `wave:frame` con `webContents.send` solo si la ventana está visible (ahorra CPU en bandeja)
- [ ] Handler `level:set` (persistido en settings)

### Paso 3 — Tests
- [ ] `gain.test.ts`: 100 % no cambia la señal, 200 % = +6.02 dB, 0 % = silencio, sin saltos en la rampa
- [ ] `meter.test.ts`: seno amplitud 1 → RMS −3.01 dBFS y pico 0 dBFS; silencio → piso; estéreo con canales distintos
- [ ] `waveform.test.ts`: número de columnas correcto y min/max exactos sobre señal conocida

### Paso 4 — Verificación
- [ ] Con música sonando y la app en Ready, los frames llegan al renderer (log en DevTools) a ~30 por segundo
- [ ] Cambiar el Level con `window.api` altera los valores del meter
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(dsp): gain, meter, waveform y monitoreo en ready`

## Criterios de aceptación
- [ ] Los módulos DSP son funciones puras con tests sobre seno, silencio y ruido
- [ ] El monitoreo funciona sin grabar
- [ ] La carga de CPU del monitoreo es baja (anotar % en Bitácora)

## Bitácora
- _(fecha — nota)_
