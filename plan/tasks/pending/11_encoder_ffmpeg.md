# 11 · Encoder ffmpeg (MP3 y WAV)

**Estado:** ⬜ Pendiente
**Fase:** 4 — Grabación · **Depende de:** 02 · **Doc:** [§3.3, §9.2–9.5, §17](../../PROMPT_rebecca_listen.md)

## Objetivo
Existe una interfaz `Encoder` desacoplada y una implementación `FfmpegEncoder` que recibe PCM f32le por stdin y escribe MP3 o WAV en un `*.part`, informa duración y tamaño en tiempo real y renombra al cerrar bien. MP3 para el uso normal, WAV para cuando se quiera calidad sin pérdida.

## Pasos

### Paso 1 — Interfaz y argumentos
- [ ] `npm i ffmpeg-static` (comprobar que trae `libmp3lame`)
- [ ] `src/main/audio/encoder/Encoder.ts`: `open(path, inputFormat, outputSettings)`, `write(frames)`, `close(): Promise<FinalFile>`, `abort()`, eventos `progress {bytes, durationMs}` y `error`
- [ ] `src/main/audio/encoder/ffmpegArgs.ts` (lógica pura): entrada `-f f32le -ar <rate> -ac <ch> -i pipe:0`; salida con `-ar`/`-ac` de la config y
  - MP3 `libmp3lame` CBR `-b:a Nk` o VBR `-q:a 0..9`
  - WAV `pcm_s16le` / `pcm_s24le` / `pcm_f32le`
- [ ] Un formato nuevo = una entrada más en el mapa de args: así OGG, FLAC, AAC u OPUS (§17) se añaden después sin tocar el resto

### Paso 2 — Implementación
- [ ] `FfmpegEncoder.ts`: spawn con la ruta de `ffmpeg-static` (en empaquetado, la ruta `app.asar.unpacked`), backpressure respetando `stdin.write()` → `drain`
- [ ] Escribir a `<nombre>.<ext>.part`; al `close()` esperar a que ffmpeg termine con código 0 y renombrar; si falla, dejar el `.part` y emitir error
- [ ] Tamaño real con `fs.stat` cada 500 ms; duración = frames escritos / sampleRate
- [ ] stderr de ffmpeg al log solo si hay error (nivel `warn`)

### Paso 3 — Tests
- [ ] `ffmpegArgs.test.ts`: MP3 CBR y VBR, WAV en sus tres profundidades, mono y estéreo, formato desconocido → error
- [ ] `FfmpegEncoder.test.ts` (integración): codificar 3 s de seno 440 Hz en MP3 y en WAV; el archivo existe sin `.part`, y `ffmpeg -i` informa duración ≈ 3 s, tasa y canales esperados
- [ ] Test de `abort()`: queda el `.part` y no el archivo final

### Paso 4 — Verificación
- [ ] Escuchar los dos archivos de prueba en el reproductor de Windows
- [ ] MP3 192 kbps de 60 s pesa ≈ 1.44 MB (base del criterio de §16: 10 min ≈ 14 MB)
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(encoder): encoder ffmpeg para mp3 y wav`

## Criterios de aceptación
- [ ] MP3 y WAV se generan correctamente desde PCM sintético
- [ ] Nunca queda un archivo final a medias: o `.part` o archivo completo
- [ ] Progreso de tamaño y duración disponible cada 500 ms

## Bitácora
- _(fecha — nota)_
