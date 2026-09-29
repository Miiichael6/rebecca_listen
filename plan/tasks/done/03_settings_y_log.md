# 03 · Settings persistentes y logging

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** 02 · **Doc:** [§1.8, §13](../../PROMPT_rebecca_listen.md)

## Objetivo
Main guarda los settings en `userData/settings.json` con schema versionado y migraciones, y registra eventos con `electron-log` rotativo. Hay una sola configuración: los perfiles quedan fuera del proyecto.

## Pasos

### Paso 1 — Logging
- [x] `src/main/log/index.ts`: `electron-log` escribiendo en `userData/logs/main.log`, `maxSize` 5 MB y rotación a 3 archivos (`archiveLogFn`)
- [x] `src/main/log/rotation.ts`: el desplazamiento de archivos en disco, sin `electron`, para poder testearlo
- [x] Capturar `uncaughtException` / `unhandledRejection` (`errorHandler.startCatching`) y registrar arranque y cierre de la app

### Paso 2 — Schema y migraciones (lógica pura)
- [x] `src/shared/settingsSchema.ts`: `SETTINGS_VERSION` y `StoredSettings = { version, settings: Settings, source, level, window: { bounds } }`
- [x] `src/main/settings/migrations.ts`: `migrate(raw): StoredSettings` con lista ordenada de migraciones (vacío/v0 → v1 con defaults; rellena claves faltantes)
- [x] `src/main/settings/validate.ts`: `validateSettings()` que recorta valores fuera de rango a los límites de `defaults.ts`, más `validateSource()` y `validateWindowBounds()`
- [x] `src/main/settings/coerce.ts`: lectores de JSON no fiable (`clampToRange`, `closestOf`, `oneOf`...) reutilizados por los dos anteriores

### Paso 3 — Servicio de settings (`src/main/settings/index.ts`)
- [x] `electron-store` con nombre `settings` (`src/main/settings/file.ts`, único módulo con acceso a disco), aplicando `migrate()` al cargar
- [x] API: `get()`, `update({ section, patch })`, `reset()`, `getSource()` / `setSource()`, `getLevel()` / `setLevel()`
- [x] `src/main/settings/patch.ts`: mezcla profunda del patch para que tocar `files.format` no borre `files.mp3`
- [x] Emisor `onChange` para que otros módulos de main reaccionen
- [x] Guardar y restaurar tamaño y posición de la ventana principal (`src/main/window.ts`, con `getWindowBounds()` / `setWindowBounds()`)

### Paso 4 — IPC y store
- [x] Handlers `settings:*` en `src/main/ipc/settings.ts`; evento `settings:changed` al renderer
- [x] Store Zustand `src/renderer/src/store/settings.ts` que carga al iniciar y escucha cambios

### Paso 5 — Tests
- [x] `settings/migrations.test.ts`: archivo vacío, v1 con claves faltantes, valores fuera de rango, versión futura (no rompe)
- [x] `settings/validate.test.ts`: cada sección con valores por encima y por debajo del límite
- [x] `log/rotation.test.ts`: la rotación sobre una carpeta temporal real nunca deja más de 3 archivos

### Paso 6 — Verificación
- [x] Cambiar un valor vía `window.api` y reiniciar: persiste en `settings.json`
- [x] Borrar `settings.json` y arrancar: se recrea con defaults; `main.log` registra el arranque
- [x] Corromper `settings.json` a mano y arrancar: la app abre con defaults y lo anota en el log
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(settings): settings versionados y electron-log`

## Criterios de aceptación
- [x] `settings.json` tiene `version` y la app sobrevive a claves faltantes o valores corruptos
- [x] La ventana recuerda tamaño y posición entre arranques
- [x] El log rota a 5 MB × 3

## Bitácora
- 2026-09-29 — Un archivo escrito por una versión futura conserva su `version` (no se degrada) y se lee lo que se entiende: así esa versión sigue reconociendo el archivo como suyo. Las claves desconocidas se descartan.
- 2026-09-29 — `update()` toma el `SettingsUpdate` completo (`{ section, patch }`) en vez de dos argumentos: es el mismo payload del canal IPC y evita casts en el handler. El patch se mezcla en profundidad para no perder subsecciones.
- 2026-09-29 — Los archivos del plan se dividieron en módulos (`settings/` y `log/`) en vez de los `settingsMigrations.ts` / `settings.ts` únicos: lógica pura (coerce, validate, migrations, patch) separada del IO (file, index) y de electron. La creación de la ventana se sacó de `main/index.ts` a `main/window.ts` con la geometría persistida.
- 2026-09-29 — Verificado con la app real conectando por CDP (`electron-vite dev -- --remote-debugging-port=9222`): `settings:update` anidado, recorte de valores fuera de rango, evento `settings:changed` y la geometría (500×700 guardada al cerrar y restaurada igual al arrancar). El umbral de 5 MB lo aplica `electron-log` y no se llenó aquí; lo que se probó con archivos reales es el desplazamiento y el máximo de 3 archivos.
- 2026-09-29 — En este entorno `ELECTRON_RUN_AS_NODE=1` está exportado y hace que `npm run dev` arranque Electron como Node (`electron.app` undefined); hay que hacer `unset` antes de lanzar la app.
