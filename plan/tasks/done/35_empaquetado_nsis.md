# 35 · Empaquetado Windows (NSIS)

**Estado:** ✅ Terminada
**Fase:** 12 — Empaquetado · **Depende de:** 17 · **Doc:** [§3.2, §10.3, §15.12](../../PROMPT_rebecca_listen.md)

## Objetivo
`npm run build:win` genera un instalador NSIS de Rebecca Listen que incluye el sidecar y ffmpeg, con icono propio, y que funciona en una instalación limpia de Windows.

## Pasos

### Paso 1 — Configuración de electron-builder
- [x] `electron-builder.yml`: `appId: com.michael.rebeccalisten`, `productName: Rebecca Listen`, `win.executableName: RebeccaListen`
- [ ] ~~`extraResources`: `resources/bin/rl-capture.exe` → `bin/`~~ (ver Bitácora: lo cubre `asarUnpack: resources/**`)
- [x] `asarUnpack` para `ffmpeg-static` ; comprobar la ruta con `app.asar.unpacked`
- [x] Quitar entradas de mac/linux o dejarlas sin tocar (anotar la decisión); quitar el mirror `npmmirror` si no se necesita
- [x] `publish` y `electron-updater` según D2 (proveedor real o eliminar el bloque `example.com`); si D2 no está resuelta, quitar el bloque `publish`
- [x] Firma de código según D3
- [x] Script `build:win` que ejecute antes `build:native`

### Paso 2 — Icono y recursos
- [x] Icono de Rebecca Listen en `build/icon.ico` (256 px, varias resoluciones) y `resources/icon.png`; (los iconos de bandeja se harán con la tarea 31 en `despues/`)
- [x] NSIS: `oneClick: false`, permitir elegir carpeta, acceso directo en escritorio y menú Inicio

### Paso 3 — Verificación
- [x] `npm run build:win` termina sin errores; anotar tamaño del instalador
- [x] Instalar en una máquina o VM limpia (Windows Sandbox sirve) sin Node, Rust ni ffmpeg: la app arranca, lista dispositivos, graba en MP3 y WAV, y el archivo se abre en el reproductor de Windows (esto último, pendiente del usuario: ver Bitácora)
- [x] Desinstalar: no quedan archivos en Program Files (userData se conserva o se pregunta; anotarlo)
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `build(win): instalador nsis con sidecar y ffmpeg`

## Criterios de aceptación
- [x] El instalador funciona en un Windows limpio
- [x] El sidecar y ffmpeg se encuentran en la app empaquetada
- [x] Nombre, icono y accesos directos son los de Rebecca Listen

## Bitácora
- 2026-09-30 — D3 resuelta: sin firmar. Solo Windows x64: fuera mac/linux (`icon.icns`, entitlements) y el mirror `npmmirror`. Sin `extraResources`: el sidecar ya va en `app.asar.unpacked/resources/bin` por `asarUnpack: resources/**`, que es donde lo busca main.
- 2026-09-30 — `rl-capture.exe` dependía de `VCRUNTIME140.dll` (no existe en Windows limpio): CRT estático en `native/.cargo/config.toml`; por eso `build:native` compila desde `native/`, donde cargo lee esa config.
- 2026-09-30 — Instalador 112,6 MB. Probado en Windows Sandbox (sin VC++, Node ni ffmpeg) con instalación `/S` y CDP: arranca, lista "Audio remoto" y graba MP3/WAV. Desinstalar borra la carpeta y los accesos directos; userData se conserva (`deleteAppDataOnUninstall: false`). Abrir el archivo en el reproductor de Windows queda para el usuario.
