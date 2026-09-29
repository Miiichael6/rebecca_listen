# 08 · Stream PCM del sidecar a main

**Estado:** ✅ Terminada
**Fase:** 3 — Captura y monitoreo · **Depende de:** 06 · **Doc:** [§3.1, §3.2, §2.1](../../PROMPT_rebecca_listen.md)

## Objetivo
El sidecar abre un dispositivo (render en loopback o capture) y envía PCM f32le por stdout; main lo demultiplexa y lo entrega mediante `AudioStream.onData()` con `sampleRate` y `channels` reales.

## Pasos

### Paso 1 — Captura en el sidecar
- [x] Comandos `open {deviceId, loopback, streamId}`, `start {streamId}`, `stop {streamId}`; respuesta `opened {streamId, sampleRate, channels}` por stderr
- [x] Render → cpal input sobre dispositivo de salida (loopback WASAPI); capture → input normal. Convertir i16/i32 a f32 si hace falta
- [x] Escribir en stdout `[streamId u8][frameCount u32 LE]` + frames f32le intercalados; bloques de ~10 ms
- [x] Silencio en loopback: WASAPI no entrega paquetes cuando no suena nada → rellenar con ceros según el reloj para no romper la línea de tiempo
- [x] Evento `stream_error {streamId, reason: "device_lost" | ...}` si el dispositivo desaparece
- [x] Actualizar `native/PROTOCOL.md`

### Paso 2 — Demux en main
- [x] `src/main/audio/engine/frameDemuxer.ts` (lógica pura): acumula chunks de stdout y emite `{streamId, frames: Float32Array}` aunque la cabecera o los datos lleguen partidos
- [x] `SidecarAudioEngine.openStream()` devuelve un `AudioStream` que usa el demuxer; `onError` recibe `stream_error`
- [x] Contador de frames perdidos/huecos para el log

### Paso 3 — Tests
- [x] `frameDemuxer.test.ts`: un bloque entero, cabecera partida en 3 chunks, varios bloques en un chunk, dos streamIds intercalados, bloque de 0 frames
- [x] Datos sintéticos: seno de 1 kHz serializado y reconstruido idéntico

### Paso 4 — Verificación
- [x] Script de prueba `scripts/dump-stream.ts` (o flag de dev) que graba 5 s del loopback a un `.raw` y reproducirlo con `ffplay -f f32le -ar 48000 -ac 2`: suena limpio
- [x] Con nada sonando, el stream sigue entregando ceros a ritmo real
- [x] `cargo test`, `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(audio): stream pcm del sidecar y demux en main`

## Criterios de aceptación
- [x] Main recibe PCM continuo de loopback y de micrófono con la tasa y canales reales
- [x] El demuxer es robusto a cualquier partición de chunks (probado)
- [ ] Desconectar el dispositivo produce `onError` con `device_lost`

## Bitácora
- 2026-09-29 — El sidecar y el demux ya existían desde 0a96b36, con desviaciones: sin `start` (el stream arranca en `open`), cabecera con `channels u16`, bloques del tamaño que da cpal (10 ms medidos) y el relleno de silencio del loopback se hace en main (`silence.ts`), no en el sidecar.
- 2026-09-29 — Verificado con `scripts/dump-stream.ts` (`node --experimental-transform-types`): tono de 1 kHz por loopback reconstruido sin saltos, 3.00 s en 3.00 s; micro (CABLE Output) igual. ffplay con `-f lavfi` daba ceros exactos: usar un WAV con SoundPlayer.
- 2026-09-29 — Silencio: solo el sidecar no entrega bloques; en la app Chromium mantiene viva la sesión y llegan ceros (grabación de 4 s → 4030 ms, 0 huecos). El relleno por huecos queda probado solo en tests. `device_lost` sin probar: no hay hardware para desconectar.
