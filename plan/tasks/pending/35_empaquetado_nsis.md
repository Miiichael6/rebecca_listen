# 35 · Empaquetado Windows (NSIS)

**Estado:** ⬜ Pendiente
**Fase:** 12 — Empaquetado · **Depende de:** 17 · **Doc:** [§3.2, §10.3, §15.12](../../PROMPT_rebecca_listen.md)

## Objetivo
`npm run build:win` genera un instalador NSIS de Rebecca Listen que incluye el sidecar y ffmpeg, con icono propio, y que funciona en una instalación limpia de Windows.

## Pasos

### Paso 1 — Configuración de electron-builder
- [ ] `electron-builder.yml`: `appId: com.michael.rebeccalisten`, `productName: Rebecca Listen`, `win.executableName: RebeccaListen`
- [ ] `extraResources`: `resources/bin/rl-capture.exe` → `bin/`
- [ ] `asarUnpack` para `ffmpeg-static` ; comprobar la ruta con `app.asar.unpacked`
- [ ] Quitar entradas de mac/linux o dejarlas sin tocar (anotar la decisión); quitar el mirror `npmmirror` si no se necesita
- [ ] `publish` y `electron-updater` según D2 (proveedor real o eliminar el bloque `example.com`); si D2 no está resuelta, quitar el bloque `publish`
- [ ] Firma de código según D3
- [ ] Script `build:win` que ejecute antes `build:native`

### Paso 2 — Icono y recursos
- [ ] Icono de Rebecca Listen en `build/icon.ico` (256 px, varias resoluciones) y `resources/icon.png`; (los iconos de bandeja se harán con la tarea 31 en `despues/`)
- [ ] NSIS: `oneClick: false`, permitir elegir carpeta, acceso directo en escritorio y menú Inicio

### Paso 3 — Verificación
- [ ] `npm run build:win` termina sin errores; anotar tamaño del instalador
- [ ] Instalar en una máquina o VM limpia (Windows Sandbox sirve) sin Node, Rust ni ffmpeg: la app arranca, lista dispositivos, graba en MP3 y WAV, y el archivo se abre en el reproductor de Windows
- [ ] Desinstalar: no quedan archivos en Program Files (userData se conserva o se pregunta; anotarlo)
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `build(win): instalador nsis con sidecar y ffmpeg`

## Criterios de aceptación
- [ ] El instalador funciona en un Windows limpio
- [ ] El sidecar y ffmpeg se encuentran en la app empaquetada
- [ ] Nombre, icono y accesos directos son los de Rebecca Listen

## Bitácora
- _(fecha — nota)_
