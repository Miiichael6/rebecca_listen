# 03 · Settings persistentes y logging

**Estado:** ⬜ Pendiente
**Fase:** 1 — Base · **Depende de:** 02 · **Doc:** [§1.8, §13](../../PROMPT_rebecca_listen.md)

## Objetivo
Main guarda los settings en `userData/settings.json` con schema versionado y migraciones, y registra eventos con `electron-log` rotativo. Hay una sola configuración: los perfiles quedan fuera del proyecto.

## Pasos

### Paso 1 — Logging
- [ ] `src/main/log.ts`: `electron-log` escribiendo en `userData/logs/main.log`, `maxSize` 5 MB y rotación a 3 archivos (`archiveLogFn`)
- [ ] Capturar `uncaughtException` / `unhandledRejection` y registrar arranque y cierre de la app

### Paso 2 — Schema y migraciones (lógica pura)
- [ ] `src/shared/settingsSchema.ts`: `SETTINGS_VERSION` y `StoredSettings = { version, settings: Settings, source, level, window: { bounds } }`
- [ ] `src/main/settingsMigrations.ts`: `migrate(raw): StoredSettings` con lista ordenada de migraciones (vacío/v0 → v1 con defaults; rellena claves faltantes)
- [ ] `validateSettings()` que recorta valores fuera de rango a los límites de `defaults.ts`

### Paso 3 — Servicio de settings (`src/main/settings.ts`)
- [ ] `electron-store` con nombre `settings`, aplicando `migrate()` al cargar
- [ ] API: `get()`, `update(section, patch)`, `getSource()` / `setSource()`, `getLevel()` / `setLevel()`
- [ ] Emisor `onChange` para que otros módulos de main reaccionen
- [ ] Guardar y restaurar tamaño y posición de la ventana principal

### Paso 4 — IPC y store
- [ ] Handlers `settings:*` en `src/main/ipc/settings.ts`; evento `settings:changed` al renderer
- [ ] Store Zustand `src/renderer/src/store/settings.ts` que carga al iniciar y escucha cambios

### Paso 5 — Tests
- [ ] `settingsMigrations.test.ts`: archivo vacío, v1 con claves faltantes, valores fuera de rango, versión futura (no rompe)
- [ ] `validateSettings.test.ts`: cada sección con valores por encima y por debajo del límite

### Paso 6 — Verificación
- [ ] Cambiar un valor vía `window.api` y reiniciar: persiste en `settings.json`
- [ ] Borrar `settings.json` y arrancar: se recrea con defaults; `main.log` registra el arranque
- [ ] Corromper `settings.json` a mano y arrancar: la app abre con defaults y lo anota en el log
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(settings): settings versionados y electron-log`

## Criterios de aceptación
- [ ] `settings.json` tiene `version` y la app sobrevive a claves faltantes o valores corruptos
- [ ] La ventana recuerda tamaño y posición entre arranques
- [ ] El log rota a 5 MB × 3

## Bitácora
- _(fecha — nota)_
