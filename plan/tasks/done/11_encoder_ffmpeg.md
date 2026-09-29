# 11 · Encoder ffmpeg (MP3 y WAV)

**Estado:** ✅ Terminada
**Fase:** 4 — Grabación · **Depende de:** 02 · **Doc:** [§3.3, §9.2–9.5, §17](../../PROMPT_rebecca_listen.md)

## Objetivo
Existe una interfaz `Encoder` desacoplada y una implementación `FfmpegEncoder` que recibe PCM f32le por stdin y escribe MP3 o WAV en un `*.part`, informa duración y tamaño en tiempo real y renombra al cerrar bien. MP3 para el uso normal, WAV para cuando se quiera calidad sin pérdida.

## Pasos

### Paso 1 — Interfaz y argumentos
- [x] `npm i ffmpeg-static` (comprobar que trae `libmp3lame`)
- [x] `src/main/audio/encoder/Encoder.ts`: `open(path, inputFormat, outputSettings)`, `write(frames)`, `close(): Promise<FinalFile>`, `abort()`, eventos `progress {bytes, durationMs}` y `error`
- [x] `src/main/audio/encoder/ffmpegArgs.ts` (lógica pura): entrada `-f f32le -ar <rate> -ac <ch> -i pipe:0`; salida con `-ar`/`-ac` de la config y
  - MP3 `libmp3lame` CBR `-b:a Nk` o VBR `-q:a 0..9`
  - WAV `pcm_s16le` / `pcm_s24le` / `pcm_f32le`
- [x] Un formato nuevo = una entrada más en el mapa de args: así OGG, FLAC, AAC u OPUS (§17) se añaden después sin tocar el resto

### Paso 2 — Implementación
- [x] `FfmpegEncoder.ts`: spawn con la ruta de `ffmpeg-static` (en empaquetado, la ruta `app.asar.unpacked`), backpressure respetando `stdin.write()` → `drain`
- [x] Escribir a `<nombre>.<ext>.part`; al `close()` esperar a que ffmpeg termine con código 0 y renombrar; si falla, dejar el `.part` y emitir error
- [x] Tamaño real con `fs.stat` cada 500 ms; duración = frames escritos / sampleRate
- [x] stderr de ffmpeg al log solo si hay error (nivel `warn`)

### Paso 3 — Tests
- [x] `ffmpegArgs.test.ts`: MP3 CBR y VBR, WAV en sus tres profundidades, mono y estéreo, formato desconocido → error
- [x] `FfmpegEncoder.test.ts` (integración): codificar 3 s de seno 440 Hz en MP3 y en WAV; el archivo existe sin `.part`, y `ffmpeg -i` informa duración ≈ 3 s, tasa y canales esperados
- [x] Test de `abort()`: queda el `.part` y no el archivo final

### Paso 4 — Verificación
- [ ] Escuchar los dos archivos de prueba en el reproductor de Windows
- [x] MP3 192 kbps de 60 s pesa ≈ 1.44 MB (base del criterio de §16: 10 min ≈ 14 MB)
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(encoder): encoder ffmpeg para mp3 y wav`

## Criterios de aceptación
- [x] MP3 y WAV se generan correctamente desde PCM sintético
- [x] Nunca queda un archivo final a medias: o `.part` o archivo completo
- [x] Progreso de tamaño y duración disponible cada 500 ms

## Bitácora
- 2026-09-29 — Sin `-probesize 32 -analyzeduration 0` ffmpeg tarda ~1 s en arrancar y, sin `-flush_packets 1`, el `.part` crece a saltos de 256 KB (a 192 kbps, uno cada ~10 s); con ambos el tamaño sube en cada tick de 500 ms.
- 2026-09-29 — Un ffmpeg que muere deja stdin lleno sin emitir `drain` ni `close`: `write` espera también la salida del proceso, si no se cuelga.
- 2026-09-29 — `binary` y `warn` se inyectan (tests sin Electron); la 13 lo conecta con `ffmpegPath()` y `logger.warn` y retira `WavWriter` de `session.ts`. `asarUnpack` incluye `node_modules/ffmpeg-static/**`.
- 2026-09-29 — Escucha (paso 4.1) no verificable por mí: decodifiqué `listen.mp3` y `listen.wav` (5 s, 440 Hz, pico −10.5 dB, sin recorte) y quedan para que el usuario las escuche. 60 s MP3 192 kbps = 1 441 197 B.
