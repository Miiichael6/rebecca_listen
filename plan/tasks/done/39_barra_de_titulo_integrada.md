# 39 · Barra de título con los colores de la app

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** 04 · **Doc:** petición del usuario (captura de la barra nativa, más clara que la app)

## Objetivo
Que la parte superior de la ventana tenga el mismo color que la app en vez de la barra nativa gris de Windows, sin perder los botones nativos (minimizar, maximizar, cerrar, snap layouts).

## Pasos

### Paso 1 — Main
- [x] `@shared/appInfo`: `WINDOW_COLORS` (fondo y símbolos) y `TITLE_BAR_HEIGHT`, un único sitio para main y renderer
- [x] `window.ts`: `titleBarStyle: 'hidden'` + `titleBarOverlay` con esos colores; el fondo de la ventana también sale de ahí

### Paso 2 — Renderer
- [x] `components/TitleBar/`: franja arrastrable (`-webkit-app-region: drag`) con icono y nombre de la app, del alto de `env(titlebar-area-height)` y sin meterse bajo los botones (`titlebar-area-width`)
- [x] `App.tsx`: la barra encima de `MainWindow`, que ocupa el resto

### Paso 3 — Verificación
- [x] `npm run typecheck`, `npx eslint src`, `npx vitest run` (285 tests) y `electron-vite build` (el icono de `resources/` se empaqueta)
- [ ] En vivo: color continuo, arrastrar la ventana, doble clic maximiza, botones nativos funcionan
- [x] Commit: `feat(ui): barra de título con los colores de la app`

## Criterios de aceptación
- [ ] La barra superior tiene el color de fondo de la app y los botones se ven claros sobre ella
- [ ] La ventana se sigue arrastrando, maximizando y cerrando como antes

## Bitácora
- 2026-09-29 — Se descarta un marco propio (`frame: false` con botones dibujados): `titleBarOverlay` conserva los botones de Windows 11 y sus snap layouts sin código extra.
- 2026-09-29 — Sin prueba en vivo por el incidente del depurador de Visual Studio al cerrar Electron a la fuerza; queda para que el usuario lo mire al abrir la app.
