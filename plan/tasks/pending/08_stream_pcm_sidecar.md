# 08 · Stream PCM del sidecar a main

**Estado:** ⬜ Pendiente
**Fase:** 3 — Captura y monitoreo · **Depende de:** 06 · **Doc:** [§3.1, §3.2, §2.1](../../PROMPT_rebecca_listen.md)

## Objetivo
El sidecar abre un dispositivo (render en loopback o capture) y envía PCM f32le por stdout; main lo demultiplexa y lo entrega mediante `AudioStream.onData()` con `sampleRate` y `channels` reales.

## Pasos

### Paso 1 — Captura en el sidecar
- [ ] Comandos `open {deviceId, loopback, streamId}`, `start {streamId}`, `stop {streamId}`; respuesta `opened {streamId, sampleRate, channels}` por stderr
- [ ] Render → cpal input sobre dispositivo de salida (loopback WASAPI); capture → input normal. Convertir i16/i32 a f32 si hace falta
- [ ] Escribir en stdout `[streamId u8][frameCount u32 LE]` + frames f32le intercalados; bloques de ~10 ms
- [ ] Silencio en loopback: WASAPI no entrega paquetes cuando no suena nada → rellenar con ceros según el reloj para no romper la línea de tiempo
- [ ] Evento `stream_error {streamId, reason: "device_lost" | ...}` si el dispositivo desaparece
- [ ] Actualizar `native/PROTOCOL.md`

### Paso 2 — Demux en main
- [ ] `src/main/audio/engine/frameDemuxer.ts` (lógica pura): acumula chunks de stdout y emite `{streamId, frames: Float32Array}` aunque la cabecera o los datos lleguen partidos
- [ ] `SidecarAudioEngine.openStream()` devuelve un `AudioStream` que usa el demuxer; `onError` recibe `stream_error`
- [ ] Contador de frames perdidos/huecos para el log

### Paso 3 — Tests
- [ ] `frameDemuxer.test.ts`: un bloque entero, cabecera partida en 3 chunks, varios bloques en un chunk, dos streamIds intercalados, bloque de 0 frames
- [ ] Datos sintéticos: seno de 1 kHz serializado y reconstruido idéntico

### Paso 4 — Verificación
- [ ] Script de prueba `scripts/dump-stream.ts` (o flag de dev) que graba 5 s del loopback a un `.raw` y reproducirlo con `ffplay -f f32le -ar 48000 -ac 2`: suena limpio
- [ ] Con nada sonando, el stream sigue entregando ceros a ritmo real
- [ ] `cargo test`, `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(audio): stream pcm del sidecar y demux en main`

## Criterios de aceptación
- [ ] Main recibe PCM continuo de loopback y de micrófono con la tasa y canales reales
- [ ] El demuxer es robusto a cualquier partición de chunks (probado)
- [ ] Desconectar el dispositivo produce `onError` con `device_lost`

## Bitácora
- _(fecha — nota)_
