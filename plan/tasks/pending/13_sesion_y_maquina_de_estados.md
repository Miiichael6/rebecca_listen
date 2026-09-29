# 13 · Sesión de grabación y máquina de estados

**Estado:** ⬜ Pendiente
**Fase:** 4 — Grabación · **Depende de:** 07, 10, 11, 12 · **Doc:** [§4.1, §4.4, §4.5, §4.8, §4.9](../../PROMPT_rebecca_listen.md)

## Objetivo
Se puede grabar de verdad: Record / Pause / Stop funcionan desde la UI, la máquina de estados vive en main y se refleja en cronómetro, badge de estado, botón de grabar y combo Source bloqueado; perder el dispositivo detiene y guarda de forma segura.

## Pasos

### Paso 1 — Máquina de estados (lógica pura)
- [ ] `src/main/audio/sessionMachine.ts`: reducer tipado con estados `idle | recording | paused` y eventos `RECORD, PAUSE, RESUME, STOP, DEVICE_LOST`
- [ ] Solo existen `idle`, `recording` y `paused` con las transiciones de §4.9; `waiting` y `scheduled` no se implementan (VAS y Schedule quedan fuera del proyecto)
- [ ] Transiciones inválidas → sin cambio + log
- [ ] Efectos como datos (`{ type: 'openFile' | 'closeFile' | 'rotateFile' | ... }`) para que el reducer sea testeable sin audio

### Paso 2 — Orquestador (`src/main/audio/session.ts`)
- [ ] Engancha el pipeline de 09: en `recording`, los frames pasan al encoder; en `paused`, no se escriben
- [ ] Cronómetro basado en frames escritos (no en reloj de pared): no avanza en pausa
- [ ] Emite `session:state` (estado, `elapsedMs`, archivo actual) al renderer, al menos 10 veces por segundo mientras graba
- [ ] `DEVICE_LOST` → cerrar el encoder correctamente, guardar el archivo, evento `notice` con aviso al usuario
- [ ] Cambios de formato/carpeta durante la grabación → aplican al siguiente archivo
- [ ] Log de inicio y fin de grabación con ruta, formato y duración

### Paso 3 — UI
- [ ] Store `store/session.ts`; `TransportBar` llama a `session:record/pause/stop`
- [ ] Botón de grabar: punto rojo en idle, cuadrado/pulso en grabación
- [ ] `Timer`: `MM:SS` → `H:MM:SS` a partir de una hora; parpadeo suave en pausa
- [ ] `StatusBar`: badge Ready (gris) / Recording (rojo) / Paused (ámbar)
- [ ] `SourcePicker` deshabilitado mientras no está en idle; waveform congelada en pausa
- [ ] La grabación en curso aparece en la lista con `--:--` en azul (la lista completa llega en 17)

### Paso 4 — Tests
- [ ] `sessionMachine.test.ts`: las transiciones implementadas, transiciones inválidas, STOP desde cualquier estado, DEVICE_LOST
- [ ] `session.test.ts` con motor y encoder falsos: 10 s de seno con 3 s de pausa → archivo de 7 s y cronómetro 7 s

### Paso 5 — Verificación
- [ ] Grabar 30 s de Computer Sounds en MP3, pausar a mitad, parar: el archivo dura lo que marca el cronómetro y suena bien
- [ ] Grabar desde unos audífonos Bluetooth y apagarlos: el archivo se guarda, se reproduce y aparece el aviso
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(session): grabación con máquina de estados, cronómetro y transporte`

## Criterios de aceptación
- [ ] Record / Pause / Stop generan archivos reproducibles en MP3 y en WAV
- [ ] El cronómetro cuenta solo tiempo grabado
- [ ] Perder el dispositivo nunca deja un archivo corrupto

## Bitácora
- _(fecha — nota)_
