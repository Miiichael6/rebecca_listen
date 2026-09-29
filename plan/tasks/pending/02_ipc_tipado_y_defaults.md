# 02 · Canales IPC tipados, defaults y preload

**Estado:** ⬜ Pendiente
**Fase:** 1 — Base · **Depende de:** 01 · **Doc:** [§1.2–1.5, §3.1, §13](../../PROMPT_rebecca_listen.md)

## Objetivo
Existe un contrato IPC único y tipado (`src/shared/ipc.ts`), los tipos de dominio compartidos, los valores por defecto centralizados y un preload mínimo que expone ese contrato al renderer.

## Pasos

### Paso 1 — Tipos de dominio (`src/shared/types.ts`)
- [ ] `AudioDevice` (§3.1) **sin el campo `state`** (solo se listan dispositivos usables; ver 05) y con `id` = nombre completo del endpoint + `kind`; y `SourceSelection` (`{ mode: 'system' | 'voice' | 'mixed' }` o `{ mode: 'device'; deviceId: string }`)
- [ ] `SessionState` (`idle | recording | paused`) y `SessionSnapshot` (estado, `elapsedMs`, archivo actual)
- [ ] `HistoryItem` según §13 y `Settings` por secciones (`files, hotkeys, system`); el núcleo solo usa `files`, pero `hotkeys` y `system` se declaran ya para no tocar el tipo al retomar 23, 30 y 31
- [ ] `AudioFormat = 'mp3' | 'wav'` (OGG y FLAC quedan fuera; ver 11)
- [ ] `MeterFrame` (`rmsDb[]`, `peakDb[]` por canal) y `WaveFrame` (picos min/max decimados)

### Paso 2 — Defaults (`src/shared/defaults.ts`)
- [ ] Todos los valores por defecto de §6–§10: MP3 48000 Hz 192 kbps CBR, WAV 16 bits, carpeta `Escritorio\Rebecca Listen Recordings`, naming `[YYYY-MM-DD][hh-mm-ss]`, hotkeys `None`, Keep history ✓, Minimize to tray ☐...
- [ ] Límites de cada campo (min / max / paso) junto a su default
- [ ] Constantes de motor: `METER_FPS = 30`, `DEVICE_POLL_MS = 2000`
- [ ] Colores de §14 como constantes exportadas (el CSS los replica como variables)

### Paso 3 — Contrato IPC (`src/shared/ipc.ts`)
- [ ] Mapa `IpcInvoke` (canal → `{ req; res }`) con: `app:info`, `settings:*`, `devices:list`, `source:set`, `level:set`, `session:record/pause/stop/split`, `history:*`, `dialog:*`, `shell:*`
- [ ] Mapa `IpcEvents` (main → renderer) con: `devices:changed`, `session:state`, `meter:frame`, `wave:frame`, `history:changed`, `settings:changed`, `notice`
- [ ] Helpers tipados `handle()` (main) e `invoke()` / `on()` (preload) que derivan los tipos del mapa

### Paso 4 — Preload y registro en main
- [ ] `src/preload/index.ts`: `contextBridge.exposeInMainWorld('api', { invoke, on })` restringido a los canales del mapa (lista blanca)
- [ ] `src/preload/index.d.ts`: `window.api` tipado desde `@shared/ipc`
- [ ] `src/main/ipc/index.ts` con `registerIpc()` y un handler real `app:info` (nombre y versión de `package.json`)

### Paso 5 — Tests
- [ ] `src/shared/defaults.test.ts`: cada default está dentro de sus propios límites
- [ ] Borrar `sanity.test.ts`

### Paso 6 — Verificación
- [ ] En el renderer, `await window.api.invoke('app:info')` devuelve nombre y versión; un canal no listado es rechazado
- [ ] Un canal o payload mal tipado en el renderer provoca error de `typecheck`
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(ipc): contrato IPC tipado, tipos compartidos y defaults`

## Criterios de aceptación
- [ ] Ningún canal IPC se declara fuera de `src/shared/ipc.ts`
- [ ] No hay valores de configuración mágicos fuera de `defaults.ts`
- [ ] El renderer solo accede a main a través de `window.api`

## Bitácora
- _(fecha — nota)_
