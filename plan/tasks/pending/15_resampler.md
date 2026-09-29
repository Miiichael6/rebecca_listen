# 15 · Resampler con ratio ajustable

**Estado:** ⬜ Pendiente
**Fase:** 5 — Mezcla · **Depende de:** 09 · **Doc:** [§2.1, §3.1](../../PROMPT_rebecca_listen.md)

## Objetivo
`src/main/audio/dsp/resampler.ts` convierte PCM intercalado entre tasas (44.1 k ↔ 48 k, etc.) con buena calidad y permite ajustar el ratio en tiempo real en pequeñas cantidades, base de la compensación de deriva de 16.

## Pasos

### Paso 1 — Implementación
- [ ] Elegir algoritmo: sinc con ventana (Kaiser, ~32 taps) o polifásico; anotar el porqué en Bitácora (alternativa: `speex-resampler` wasm si la calidad o la CPU en JS no alcanzan)
- [ ] API con estado entre llamadas: `new Resampler({ inRate, outRate, channels })`, `process(frames): Float32Array`, `setRatioAdjust(ppm)` (±1000 ppm), `flush()`
- [ ] Sin clics en los bordes de bloque (conserva el historial del filtro)
- [ ] Atajo sin coste cuando `inRate === outRate` y ajuste 0

### Paso 2 — Tests
- [ ] 44100 → 48000: seno 1 kHz sigue a 1 kHz (FFT o cruces por cero) y el número de frames de salida es el esperado ±1
- [ ] Procesar en bloques de tamaños aleatorios da el mismo resultado que en un solo bloque
- [ ] Seno de 21 kHz a 48 k → 44.1 k queda atenuado (antialiasing)
- [ ] `setRatioAdjust(+100 ppm)` durante 60 s simulados produce 100 ppm más de frames
- [ ] Benchmark: 1 h de estéreo 48 k procesada en < 1 % del tiempo real por núcleo (anotar cifra)

### Paso 3 — Verificación
- [ ] Remuestrear un WAV real de 44.1 k a 48 k con un script de dev y escucharlo: sin artefactos audibles
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(dsp): resampler con ajuste de ratio`

## Criterios de aceptación
- [ ] Conversión correcta entre las tasas de §9.2 probada con tests
- [ ] El resultado no depende de cómo se partan los bloques
- [ ] El ajuste de ratio en ppm funciona y es continuo

## Bitácora
- _(fecha — nota)_
