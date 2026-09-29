# 01 · Estructura base y herramientas

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** — · **Doc:** [§1, §2, §14](../../PROMPT_rebecca_listen.md)

## Objetivo
El proyecto tiene la estructura de carpetas de §2, las dependencias base instaladas, Vitest funcionando y una ventana principal segura (sandbox) con el tamaño y título de Rebecca Listen, sin restos de la plantilla de electron-vite.

## Pasos

### Paso 1 — Dependencias
- [x] `npm i zustand lucide-react electron-log electron-store`
- [x] `npm i -D vitest` y scripts `"test": "vitest run"` y `"test:watch": "vitest"` en `package.json`
- [x] Comprobar que `electron-store` (solo ESM) se empaqueta bien en main con electron-vite (si no, excluirlo de `externalizeDepsPlugin` o fijar una versión compatible); anotarlo en Bitácora
- [x] Rellenar `name` / `productName` / `author` / `description` en `package.json` (`Rebecca Listen`, autor `Michael`)

### Paso 2 — Estructura de carpetas (§2)
- [x] Crear `src/shared/`, `src/main/{ipc,audio/{engine,dsp,encoder},files}`, `src/renderer/src/{windows/Main,components,store}` y `native/` (con un README de una línea)
- [x] Alias `@shared` en `electron.vite.config.ts` (main, preload y renderer) y en `tsconfig.node.json` / `tsconfig.web.json`
- [x] `vitest.config.ts` en la raíz con el mismo alias e `include: ['src/**/*.test.ts']`
- [x] Test trivial `src/shared/sanity.test.ts` para comprobar que Vitest corre (se borra en 02)

### Paso 3 — Ventana principal
- [x] `src/main/index.ts`: `width: 445, height: 620, minWidth: 420, minHeight: 560`, `title: 'Rebecca Listen'`, icono también en Windows
- [x] `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (preload compilado a CJS)
- [x] `electronApp.setAppUserModelId('com.michael.rebeccalisten')` y el mismo `appId` en `electron-builder.yml`
- [x] Quitar el IPC `ping`, `Versions.tsx`, `electron.svg`, `wavy-lines.svg` y el CSS de la plantilla; `App.tsx` muestra solo "Rebecca Listen"
- [x] `<title>` de `src/renderer/index.html` = Rebecca Listen; CSP revisada
- [x] Los textos de la UI van en inglés directamente en los componentes (sin capa de i18n; el selector de idioma y la extracción de textos están en `despues/`, tarea 31)

### Paso 4 — Verificación
- [x] `npm run dev` abre una ventana 445×620 titulada "Rebecca Listen" que no se deja reducir por debajo de 420×560
- [x] En DevTools, `window.require` y `process` no existen en el renderer
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `chore(base): estructura de carpetas, dependencias y ventana segura`

## Criterios de aceptación
- [x] La estructura de `src/` coincide con §2 y el alias `@shared` funciona en main, preload, renderer y tests
- [x] La ventana arranca con sandbox activado y sin restos de la plantilla
- [x] `npm test` ejecuta Vitest correctamente

## Bitácora
- 2026-09-29 — `electron-store` 11 es solo ESM: externalizado se compila a `require()` y el default no es constructor (`Store is not a constructor`, comprobado ejecutando el build). Se excluye de `externalizeDepsPlugin` en la config de `main` para que Vite lo bundlee.
- 2026-09-29 — `@shared/appInfo.ts` guarda `APP_NAME`, `APP_ID` y el tamaño de la ventana; el `preload` lo importa (expone `api.appName`, provisional) para dejar el alias probado también ahí antes de 02.
- 2026-09-29 — El entorno de desarrollo tiene `ELECTRON_RUN_AS_NODE=1`; hay que desactivarlo (`unset`) o Electron arranca como Node y `app` es `undefined`.
- 2026-09-29 — Verificación de la ventana hecha con una sonda temporal en `did-finish-load`: 445×620 al abrir, 420×560 tras intentar reducirla a 100×100, título correcto y `window.require` / `process` `undefined`.
