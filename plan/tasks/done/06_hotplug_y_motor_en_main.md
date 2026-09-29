# 06 · Sondeo de dispositivos y motor de audio en main

**Estado:** ✅ Terminada
**Fase:** 2 — Dispositivos · **Depende de:** 05 · **Doc:** [§3.1, §3.2, §4.1](../../PROMPT_rebecca_listen.md)

## Objetivo
Main arranca y vigila el sidecar, implementa `listDevices()` y `onDevicesChanged()` de la interfaz `AudioEngine` sondeando la lista cada 2 s, y reenvía los cambios al renderer. Toda la detección de conexiones vive en TypeScript, no en Rust.

## Pasos

### Paso 1 — Interfaz y proceso
- [x] `src/main/audio/engine/AudioEngine.ts`: interfaces `AudioEngine` y `AudioStream` de §3.1 (independientes de la plataforma)
- [x] `src/main/audio/engine/sidecarProcess.ts`: spawn de `resources/bin/rl-capture.exe` (ruta dev vs empaquetada), escritura de comandos, lector de stderr por líneas (mensajes JSON en `sidecarMessages.ts`)
- [x] Reinicio automático si el proceso muere (máx. 3 veces por minuto, `restartBudget.ts`) con log en `electron-log`
- [x] `src/main/audio/engine/SidecarAudioEngine.ts`: `listDevices()` manda `list` y espera la respuesta con timeout; ~~`openStream()` lanza `not implemented` hasta 08~~ (ya implementado, ver Bitácora)

### Paso 2 — Sondeo y detección de cambios
- [x] `DEVICE_POLL_MS = 2000` en `defaults.ts`; temporizador en main que pide `list` (`engine/devicePoller.ts`)
- [x] `diffDevices(prev, next)` (función pura): devuelve si hubo alta, baja o cambio de dispositivo por defecto; solo se emite `onDevicesChanged` si cambió algo
- [x] No sondear mientras la ventana está oculta o minimizada (`audio/deviceWatch.ts`); pedir la lista al volver a mostrarse
- [x] `src/main/audio/devices.ts`: resolución de los modos rápidos (Computer Sounds → render por defecto, Voice → capture por defecto); la caché de la última lista vive en `DevicePoller`

### Paso 3 — IPC
- [x] Handler `devices:list` y evento `devices:changed` al renderer
- [x] Store Zustand `store/devices.ts`
- [x] Enumeración: cada `warning` de endpoint omitido se loguea una sola vez (se repetiría en cada sondeo)

### Paso 4 — Tests
- [x] `lineReader.test.ts`: líneas partidas entre chunks, varias líneas en un chunk, JSON inválido (se loguea y se ignora)
- [x] `diffDevices.test.ts`: sin cambios, alta, baja, cambio de dispositivo por defecto, lista vacía, mismo contenido en distinto orden
- [x] `devices.test.ts`: resolución de modos rápidos con y sin dispositivo por defecto
- [x] `devicePoller.test.ts` (línea base, pausa y reanudación, fallos en racha) y `restartBudget.test.ts`

### Paso 5 — Verificación
- [ ] Con la app abierta, conectar y desconectar unos audífonos: `devices:changed` llega al renderer (ver en DevTools) en 2 s o menos — sin hardware a mano; se repite en la verificación de 07 (ver Bitácora)
- [x] Matar `rl-capture.exe` desde el Administrador de tareas: main lo relanza y lo registra en el log
- [x] Con la app en reposo 5 min, el log no se llena de eventos (solo cambios reales)
- [x] `cargo test`, `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(audio): sondeo de dispositivos y motor de audio sidecar`

## Criterios de aceptación
- [ ] La lista del renderer se actualiza sola al conectar o desconectar hardware, en 2 s o menos — cubierto por `diffDevices`/`devicePoller` en tests; la prueba física queda para 07
- [x] Un fallo del sidecar no tumba la app
- [x] `AudioEngine` no depende de nada específico de Windows

## Bitácora
- 2026-09-29 — `openStream()` ya estaba implementado (commit 0a96b36, grabación WAV adelantada), así que no se dejó el stub de "not implemented".
- 2026-09-29 — Prueba física de hot-plug no hecha: sin audífonos a mano ni permisos de admin para deshabilitar un endpoint; se cerró con tests del sondeo y se repite en la verificación de 07.
