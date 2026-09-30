# 40 · "Open file location" abre el Explorador, no Visual Studio

**Estado:** ✅ Terminada
**Fase:** 6 — Lista · **Depende de:** 37 · **Doc:** fallo reportado por el usuario

## Objetivo
El icono de carpeta y "Open file location" abren el Explorador con el archivo seleccionado aunque otra app (Visual Studio) se haya registrado sobre las carpetas.

## Pasos

### Paso 1 — Main
- [x] `files/explorer.ts`: `openFolder` (sacado de `ipc/audio.ts`) y `showInFolder` con `explorer.exe /select,"<ruta>"`, sin pasar por el verbo por defecto de las carpetas
- [x] `ipc/history.ts` usa `showInFolder` en vez de `shell.showItemInFolder`; `ipc/audio.ts` usa `openFolder` del módulo

### Paso 2 — Verificación
- [x] `npm run typecheck`, `npx eslint src`, `npx vitest run`
- [ ] En vivo (usuario): el icono de carpeta abre el Explorador con el archivo seleccionado, también con espacios en la ruta
- [x] Commit: `fix(history): abrir la ubicación con el Explorador`

## Criterios de aceptación
- [ ] "Open file location" y el icono de carpeta nunca abren Visual Studio
- [ ] El archivo queda seleccionado en el Explorador

## Bitácora
- 2026-09-29 — Causa: `HKCR\Directory\shell` tiene el verbo `AnyCode` ("Abrir en Visual Studio") y ningún verbo por defecto; `shell.showItemInFolder` pasa por esa asociación.
- 2026-09-29 — `windowsVerbatimArguments`: Node entrecomilla `/select,ruta` entero y el Explorador lo ignora con espacios en la ruta.
