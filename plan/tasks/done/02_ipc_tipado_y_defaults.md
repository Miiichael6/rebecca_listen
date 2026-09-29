# 02 · Canales IPC tipados, defaults y preload

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** 01 · **Doc:** [§1.2–1.5, §3.1, §13](../../PROMPT_rebecca_listen.md)

## Objetivo
Existe un contrato IPC único y tipado (`src/shared/ipc.ts`), los tipos de dominio compartidos, los valores por defecto centralizados y un preload mínimo que expone ese contrato al renderer.

## Pasos

### Paso 1 — Tipos de dominio (`src/shared/types.ts`)
- [x] `AudioDevice` (§3.1) **sin el campo `state`** (solo se listan dispositivos usables; ver 05) y con `id` = nombre completo del endpoint + `kind`; y `SourceSelection` (`{ mode: 'system' | 'voice' | 'mixed' }` o `{ mode: 'device'; deviceId: string }`)
- [x] `SessionState` (`idle | recording | paused`) y `SessionSnapshot` (estado, `elapsedMs`, archivo actual)
- [x] `HistoryItem` según §13 y `Settings` por secciones (`files, hotkeys, system`); el núcleo solo usa `files`, pero `hotkeys` y `system` se declaran ya para no tocar el tipo al retomar 23, 30 y 31
- [x] `AudioFormat = 'mp3' | 'wav'` (OGG y FLAC quedan fuera; ver 11)
- [x] `MeterFrame` (`rmsDb[]`, `peakDb[]` por canal) y `WaveFrame` (picos min/max decimados)

### Paso 2 — Defaults (`src/shared/defaults.ts`)
- [x] Todos los valores por defecto de §6–§10: MP3 48000 Hz 192 kbps CBR, WAV 16 bits, carpeta `Escritorio\Rebecca Listen Recordings`, naming `[YYYY-MM-DD][hh-mm-ss]`, hotkeys `None`, Keep history ✓, Minimize to tray ☐...
- [x] Límites de cada campo (min / max / paso) junto a su default
- [x] Constantes de motor: `METER_FPS = 30`, `DEVICE_POLL_MS = 2000`
- [x] Colores de §14 como constantes exportadas (el CSS los replica como variables)

### Paso 3 — Contrato IPC (`src/shared/ipc.ts`)
- [x] Mapa `IpcInvoke` (canal → `{ req; res }`) con: `app:info`, `settings:*`, `devices:list`, `source:set`, `level:set`, `session:record/pause/stop/split`, `history:*`, `dialog:*`, `shell:*`
- [x] Mapa `IpcEvents` (main → renderer) con: `devices:changed`, `session:state`, `meter:frame`, `wave:frame`, `history:changed`, `settings:changed`, `notice`
- [x] Helpers tipados `handle()` (main) e `invoke()` / `on()` (preload) que derivan los tipos del mapa

### Paso 4 — Preload y registro en main
- [x] `src/preload/index.ts`: `contextBridge.exposeInMainWorld('api', { invoke, on })` restringido a los canales del mapa (lista blanca)
- [x] `src/preload/index.d.ts`: `window.api` tipado desde `@shared/ipc`
- [x] `src/main/ipc/index.ts` con `registerIpc()` y un handler real `app:info` (nombre y versión de `package.json`)

### Paso 5 — Tests
- [x] `src/shared/defaults.test.ts`: cada default está dentro de sus propios límites
- [x] Borrar `sanity.test.ts`

### Paso 6 — Verificación
- [x] En el renderer, `await window.api.invoke('app:info')` devuelve nombre y versión; un canal no listado es rechazado
- [x] Un canal o payload mal tipado en el renderer provoca error de `typecheck`
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(ipc): contrato IPC tipado, tipos compartidos y defaults`

## Criterios de aceptación
- [x] Ningún canal IPC se declara fuera de `src/shared/ipc.ts`
- [x] No hay valores de configuración mágicos fuera de `defaults.ts`
- [x] El renderer solo accede a main a través de `window.api`

## Bitácora
- 2026-09-29 — `src/shared/ipc.ts` no importa `electron`: el renderer lo empaqueta y solo puede usar los tipos y las listas blancas. Los envoltorios que sí usan `electron` viven aparte: `handle()` / `emit()` / `broadcast()` en `src/main/ipc/typed.ts` e `invoke()` / `on()` en `src/preload/api.ts`.
- 2026-09-29 — Las listas `INVOKE_CHANNELS` y `EVENT_CHANNELS` se escriben a mano (`as const satisfies`) porque una interfaz no se puede recorrer en tiempo de ejecución. Los tipos `AllInvokeChannelsListed` / `AllEventChannelsListed` resuelven a `true` solo si cubren el mapa entero, y `ipc.test.ts` los asigna para que un canal olvidado rompa el `typecheck`.
- 2026-09-29 — Se deja de exponer `window.electron` (`electronAPI` de `@electron-toolkit/preload`): daba acceso a `ipcRenderer` en cualquier canal y rompía el criterio de que el renderer solo hable por `window.api`. La dependencia sigue en `package.json`, sin usar.
- 2026-09-29 — `app:info` devuelve `APP_NAME` de `@shared/appInfo` (= `productName`) en vez de `app.getName()`, que lee el campo `name` (`rebecca_listen`). La versión sí sale de `app.getVersion()`.
- 2026-09-29 — `files.folder` por defecto es `''`, no una ruta: la carpeta real (`<Escritorio>\Rebecca Listen Recordings`) la resuelve main con `app.getPath('desktop')` en la 12, y `defaults.ts` no puede tocar `app`.
- 2026-09-29 — La spec no da un valor por defecto para la calidad VBR de MP3 (§9.2 solo dice V0–V9); se fija `DEFAULT_MP3_VBR_QUALITY = 2` (≈190 kbps, equivalente al CBR 192 por defecto). Solo se usa si la 22 activa el modo VBR.
- 2026-09-29 — `MeterFrame` lleva solo `rmsDb` y `peakDb`; el peak hold de 1 s (§4.2) se calcula en el renderer con `VU_PEAK_HOLD_MS`. `HistoryItem` se queda en los campos de §13: el `exists` lo añade la 17.
- 2026-09-29 — Verificación hecha con una sonda temporal en `did-finish-load`: `{"info":{"name":"Rebecca Listen","version":"1.0.0"},"blocked":"Blocked IPC channel: fs:readFile","electron":"undefined"}`. Con llamadas mal tipadas a propósito, `typecheck:web` da tres errores (canal de invoke desconocido, payload `string` en `level:set`, canal de evento desconocido).
