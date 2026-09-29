# 06 · Sondeo de dispositivos y motor de audio en main

**Estado:** ⬜ Pendiente
**Fase:** 2 — Dispositivos · **Depende de:** 05 · **Doc:** [§3.1, §3.2, §4.1](../../PROMPT_rebecca_listen.md)

## Objetivo
Main arranca y vigila el sidecar, implementa `listDevices()` y `onDevicesChanged()` de la interfaz `AudioEngine` sondeando la lista cada 2 s, y reenvía los cambios al renderer. Toda la detección de conexiones vive en TypeScript, no en Rust.

## Pasos

### Paso 1 — Interfaz y proceso
- [ ] `src/main/audio/engine/AudioEngine.ts`: interfaces `AudioEngine` y `AudioStream` de §3.1 (independientes de la plataforma)
- [ ] `src/main/audio/engine/sidecarProcess.ts`: spawn de `resources/bin/rl-capture.exe` (ruta dev vs empaquetada con `app.isPackaged` y `process.resourcesPath`), escritura de comandos, lector de stderr por líneas
- [ ] Reinicio automático si el proceso muere (máx. 3 veces por minuto) con log en `electron-log`
- [ ] `src/main/audio/engine/SidecarAudioEngine.ts`: `listDevices()` manda `list` y espera la respuesta con timeout; `openStream()` lanza `not implemented` hasta 08

### Paso 2 — Sondeo y detección de cambios
- [ ] `DEVICE_POLL_MS = 2000` en `defaults.ts`; temporizador en main que pide `list`
- [ ] `diffDevices(prev, next)` (función pura): devuelve si hubo alta, baja o cambio de dispositivo por defecto; solo se emite `onDevicesChanged` si cambió algo
- [ ] No sondear mientras la ventana está oculta (mismo criterio que los frames del medidor en 09); pedir la lista al volver a mostrarse
- [ ] `src/main/audio/devices.ts`: caché de la lista y resolución de los modos rápidos (Computer Sounds → render por defecto, Voice → capture por defecto)

### Paso 3 — IPC
- [ ] Handler `devices:list` y evento `devices:changed` al renderer
- [ ] Store Zustand `store/devices.ts`

### Paso 4 — Tests
- [ ] `lineReader.test.ts`: líneas partidas entre chunks, varias líneas en un chunk, JSON inválido (se loguea y se ignora)
- [ ] `diffDevices.test.ts`: sin cambios, alta, baja, cambio de dispositivo por defecto, lista vacía, mismo contenido en distinto orden
- [ ] `devices.test.ts`: resolución de modos rápidos con y sin dispositivo por defecto

### Paso 5 — Verificación
- [ ] Con la app abierta, conectar y desconectar unos audífonos: `devices:changed` llega al renderer (ver en DevTools) en 2 s o menos
- [ ] Matar `rl-capture.exe` desde el Administrador de tareas: main lo relanza y lo registra en el log
- [ ] Con la app en reposo 5 min, el log no se llena de eventos (solo cambios reales)
- [ ] `cargo test`, `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(audio): sondeo de dispositivos y motor de audio sidecar`

## Criterios de aceptación
- [ ] La lista del renderer se actualiza sola al conectar o desconectar hardware, en 2 s o menos
- [ ] Un fallo del sidecar no tumba la app
- [ ] `AudioEngine` no depende de nada específico de Windows

## Bitácora
- _(fecha — nota)_
