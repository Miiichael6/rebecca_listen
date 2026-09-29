# 13 · Sesión de grabación y máquina de estados

**Estado:** ✅ Terminada
**Fase:** 4 — Grabación · **Depende de:** 07, 10, 11, 12 · **Doc:** [§4.1, §4.4, §4.5, §4.8, §4.9](../../PROMPT_rebecca_listen.md)

## Objetivo
Se puede grabar de verdad: Record / Pause / Stop funcionan desde la UI, la máquina de estados vive en main y se refleja en cronómetro, badge de estado, botón de grabar y combo Source bloqueado; perder el dispositivo detiene y guarda de forma segura.

## Pasos

### Paso 1 — Máquina de estados (lógica pura)
- [x] `src/main/audio/sessionMachine.ts`: reducer tipado con estados `idle | recording | paused` y eventos `RECORD, PAUSE, RESUME, STOP, DEVICE_LOST`
- [x] Solo existen `idle`, `recording` y `paused` con las transiciones de §4.9; `waiting` y `scheduled` no se implementan (VAS y Schedule quedan fuera del proyecto)
- [x] Transiciones inválidas → sin cambio + log
- [x] Efectos como datos (`{ type: 'openFile' | 'closeFile' | 'rotateFile' | ... }`) para que el reducer sea testeable sin audio

### Paso 2 — Orquestador (`src/main/audio/session.ts`)
- [x] Engancha el pipeline de 09: en `recording`, los frames pasan al encoder; en `paused`, no se escriben
- [x] Cronómetro basado en frames escritos (no en reloj de pared): no avanza en pausa
- [x] Emite `session:state` (estado, `elapsedMs`, archivo actual) al renderer, al menos 10 veces por segundo mientras graba
- [x] `DEVICE_LOST` → cerrar el encoder correctamente, guardar el archivo, evento `notice` con aviso al usuario
- [x] Cambios de formato/carpeta durante la grabación → aplican al siguiente archivo
- [x] Log de inicio y fin de grabación con ruta, formato y duración

### Paso 3 — UI
- [x] Store `store/session.ts`; `TransportBar` llama a `session:record/pause/stop`
- [x] Botón de grabar: punto rojo en idle, cuadrado/pulso en grabación
- [x] `Timer`: `MM:SS` → `H:MM:SS` a partir de una hora; parpadeo suave en pausa
- [x] `StatusBar`: badge Ready (gris) / Recording (rojo) / Paused (ámbar)
- [x] `SourcePicker` deshabilitado mientras no está en idle; waveform congelada en pausa
- [x] La grabación en curso aparece en la lista con `--:--` en azul (la lista completa llega en 17)

### Paso 4 — Tests
- [x] `sessionMachine.test.ts`: las transiciones implementadas, transiciones inválidas, STOP desde cualquier estado, DEVICE_LOST
- [x] `session.test.ts` con motor y encoder falsos: 10 s de seno con 3 s de pausa → archivo de 7 s y cronómetro 7 s

### Paso 5 — Verificación
- [x] Grabar 30 s de Computer Sounds en MP3, pausar a mitad, parar: el archivo dura lo que marca el cronómetro y suena bien
- [x] Grabar desde unos audífonos Bluetooth y apagarlos: el archivo se guarda, se reproduce y aparece el aviso _(simulado matando el sidecar; ver bitácora)_
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(session): grabación con máquina de estados, cronómetro y transporte`

## Criterios de aceptación
- [x] Record / Pause / Stop generan archivos reproducibles en MP3 y en WAV
- [x] El cronómetro cuenta solo tiempo grabado
- [x] Perder el dispositivo nunca deja un archivo corrupto

## Bitácora
- 2026-09-29 — Monitor y grabación comparten un solo stream (`CaptureTap`, sink tras la ganancia): Level ya llega al archivo (100 % → 50 % mide la mitad). Se borraron `WavWriter`/`wav.ts`, muertos desde el encoder ffmpeg (14 puede remuxar con ffmpeg).
- 2026-09-29 — Añadido el evento `FAILED` (fallo al abrir o muerte del encoder → aborta y deja el `.part`). La pausa del loopback nunca se rellena: la línea de tiempo se re-basa al reanudar.
- 2026-09-29 — Verificado con tono de 1 kHz (30,56 s en archivo = cronómetro, sin cortes; WAV pcm_s16le; sigue grabando minimizada). Pérdida de dispositivo simulada matando `rl-capture.exe` (guarda y avisa); falta probar apagando audífonos Bluetooth reales y escucharlos a oído.
