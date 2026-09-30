# 15 · Resampler con ratio ajustable

**Estado:** ✅ Terminada
**Fase:** 5 — Mezcla · **Depende de:** 09 · **Doc:** [§2.1, §3.1](../../PROMPT_rebecca_listen.md)

## Objetivo
`src/main/audio/dsp/resampler.ts` convierte PCM intercalado entre tasas (44.1 k ↔ 48 k, etc.) con buena calidad y permite ajustar el ratio en tiempo real en pequeñas cantidades, base de la compensación de deriva de 16.

## Pasos

### Paso 1 — Implementación
- [x] Elegir algoritmo: sinc con ventana (Kaiser, ~32 taps) o polifásico; anotar el porqué en Bitácora (alternativa: `speex-resampler` wasm si la calidad o la CPU en JS no alcanzan)
- [x] API con estado entre llamadas: `new Resampler({ inRate, outRate, channels })`, `process(frames): Float32Array`, `setRatioAdjust(ppm)` (±1000 ppm), `flush()`
- [x] Sin clics en los bordes de bloque (conserva el historial del filtro)
- [x] Atajo sin coste cuando `inRate === outRate` y ajuste 0

### Paso 2 — Tests
- [x] 44100 → 48000: seno 1 kHz sigue a 1 kHz (FFT o cruces por cero) y el número de frames de salida es el esperado ±1
- [x] Procesar en bloques de tamaños aleatorios da el mismo resultado que en un solo bloque
- [x] Seno de 21 kHz a 48 k → 44.1 k queda atenuado (antialiasing)
- [x] `setRatioAdjust(+100 ppm)` durante 60 s simulados produce 100 ppm más de frames
- [x] Benchmark: 1 h de estéreo 48 k procesada en < 1 % del tiempo real por núcleo (anotar cifra)

### Paso 3 — Verificación
- [ ] Remuestrear un WAV real de 44.1 k a 48 k con un script de dev y escucharlo: sin artefactos audibles (script hecho; falta la escucha del usuario)
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(dsp): resampler con ajuste de ratio`

## Criterios de aceptación
- [x] Conversión correcta entre las tasas de §9.2 probada con tests
- [x] El resultado no depende de cómo se partan los bloques
- [x] El ajuste de ratio en ppm funciona y es continuo

## Bitácora
- 2026-09-29 — Sinc con ventana Kaiser en JS (16 cruces por lado, β 7, corte al 90 % del Nyquist menor, 512 fases interpoladas): plano hasta 18 kHz, 23 kHz −74 dB a 48→44.1 k; más taps pasaba del 1 % de CPU y no hizo falta speex.
- 2026-09-29 — Benchmark: 60 s de estéreo 48→44.1 k en 0,63 % del tiempo real (extrapolado a 1 h, sin correr la hora entera). El test de 21 kHz se cambió a 21 kHz ≤ −12 dB (banda de transición) + 23 kHz ≤ −70 dB (el alias de verdad).
- 2026-09-29 — `scripts/resample-wav.ts` pasó una grabación real 44.1→48 k: 486423→529441 frames (exacto) y mismos niveles; la escucha queda para el usuario.
