# 37 · Menú de archivo ampliado y botón de carpeta

**Estado:** ✅ Terminada
**Fase:** 6 — Lista · **Depende de:** 17 · **Doc:** menú contextual de la app original (captura del usuario) · **Ref:** `plan/images/app.png`

## Objetivo
Completar el menú contextual de cada grabación con lo que tiene la app original y aplica aquí (Tag Editor, Convert to, Merge all to one, Clear all), y poner junto a cada nombre de la lista un icono de carpeta que abre su ubicación.

## Pasos

### Paso 1 — Main (`src/main/history/`)
- [x] `transcodeArgs.ts` (puro): `convertArgs` (conserva etiquetas, `-n` nunca sobrescribe) y `mergeArgs` (`concat` tras `aformat` a 48 kHz estéreo, porque los archivos pueden diferir)
- [x] `tags.ts` (puro): lectura como `ffmetadata` con sus escapes, escritura con `-c copy`; un campo vacío borra la etiqueta
- [x] `audioEdits.ts`: `convert` (copia al lado, `nombre (1).ext` si existe), `mergeAll` (archivos existentes, del más antiguo al más nuevo, `Merged [fecha][hora].ext` junto al más nuevo) y `writeTags` (temporal y renombrado sobre el original)
- [x] `fileName.ts`: `firstFreePath` y `withFormat`; `ffmpegArgs.ts` expone `fileCodecArgs` y `muxerArgs` para reutilizar los ajustes de Files
- [x] IPC `history:convert`, `history:merge`, `history:readTags`, `history:writeTags` con avisos "Converting…/Merging…" y "Saved <nombre>"
- [x] `file.ts`: el renombrado de `history.json` reintenta ante `EPERM/EACCES/EBUSY`

### Paso 2 — Renderer
- [x] `ContextMenu`: un nivel de submenús (hover, `→`/`Enter` abren, `←`/`Esc` vuelven; se coloca al lado con sitio)
- [x] `RecordingList`: orden del original — Play, Open with default app | Rename, Tag Editor…, Duplicate | Convert to ▸, Merge all to one ▸ | Open file location, Copy path | Remove from list, Delete file, Clear all…
- [x] Convert to: el formato actual deshabilitado; Merge: deshabilitado con menos de `MERGE_MIN_FILES` archivos en disco
- [x] Botón de carpeta tras cada nombre (deshabilitado si el archivo no existe)
- [x] `TagEditor` modal (Title, Artist, Album, Year, Genre, Comment); para la reproducción de ese archivo antes de reescribirlo
- [x] `recordingCommandAvailability.ts`: `parseFormatCommand`, `canMerge`; Clear all y Merge siguen disponibles en una fila sin archivo

### Paso 3 — Tests
- [x] `tags.test.ts`, `transcodeArgs.test.ts`, `recordingCommandAvailability.test.ts`
- [x] `audioEdits.test.ts`: integración con ffmpeg real (convertir conserva etiquetas, colisión de nombre, unir 44,1 k + 48 k, ida y vuelta de etiquetas en mp3 y wav)

### Paso 4 — Verificación
- [x] `npm run typecheck`, `npx eslint src` y `npx vitest run` (275 tests) pasan
- [x] En vivo por CDP con userData aislado: menú y submenú con clics reales, conversión WAV→MP3, unión por teclado (4000 ms), Tag Editor escrito y guardado con `Enter`
- [x] Commit: `feat(history): menú de archivo ampliado (tags, convertir, unir) y botón de carpeta`

## Criterios de aceptación
- [x] Cada fila tiene un icono de carpeta que abre su ubicación
- [x] Convertir y unir crean archivos nuevos en la lista sin sobrescribir nada
- [x] Las etiquetas editadas se leen de vuelta del archivo

## Bitácora
- 2026-09-29 — Fuera de alcance: Transcribe with WizWhisp (producto de terceros), Trim (retirado del proyecto) y Share via email (el usuario dijo que no). Formatos solo MP3 y WAV, a petición del usuario; OGG/FLAC se descartaron.
- 2026-09-29 — Merge no lleva etiquetas (`-map_metadata -1`): mezclaría las de varios archivos.
- 2026-09-29 — El `EPERM` intermitente al renombrar `history.json.tmp` (antivirus/indexador de Windows) se resuelve con reintentos cortos síncronos.
- 2026-09-29 — El botón de carpeta usa el mismo IPC que "Open file location"; por CDP se comprobó que el clic llega, pero no se pudo ver la pestaña que abre el Explorador de Windows 11.
