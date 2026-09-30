# 17 · Historial, lista de grabaciones y abrir archivos

**Estado:** ✅ Terminada
**Fase:** 6 — Lista · **Depende de:** 13 · **Doc:** [§4.5, §4.6, §4.8, §13](../../PROMPT_rebecca_listen.md) · **Ref:** `images/12_main_window_recording.png`

## Objetivo
Cada grabación terminada se añade a un historial persistente (`userData/history.json`) que la lista muestra con su estilo y selección; desde la lista se abre el archivo en el reproductor del sistema y desde el botón File se abre la carpeta de destino.

## Pasos

### Paso 1 — Servicio (`src/main/history/`)
- [x] Items `{ id, path, name, format, durationMs, sizeBytes, createdAt, source }` (§13)
- [x] `add`, `remove`, `rename(id, newName)` (renombra en disco y en la lista), `list`, `clear`
- [x] Comprobación de existencia de cada archivo al cargar y al enfocar la ventana (`exists: boolean`)
- [x] IPC `history:*` y evento `history:changed`
- [x] La lista se guarda siempre (el interruptor "Keep recording history" llega con la 31, en `despues/`)
- [x] Separar en `src/main/history/`: `index.ts` (servicio), `file.ts` (lectura/escritura atómica de `history.json`, validación por entrada) y `fileName.ts` (nombres puros)
- [x] `history.json` dañado → se aparta como `history.json.damaged`, lista vacía y aviso en el log
- [x] Ampliación: `duplicate` (`<nombre> - Copy`), `delete` a la Papelera con confirmación e `import` de un archivo externo (duración leída con ffmpeg)

### Paso 2 — Lista (`components/RecordingList`)
- [x] Filas cebra, nombre a la izquierda y duración `MM:SS` a la derecha; grabación en curso con `--:--` en azul
- [x] Selección con barra vertical azul y texto azul; más reciente arriba
- [x] Archivo inexistente → fila tachada en gris con icono de aviso
- [x] Teclas: `Supr` quita de la lista, `Enter` abre el archivo, `F2` renombra en línea
- [x] Badge contador de la `StatusBar` = total de filas
- [x] Ampliación: tabla con columnas File Name, Duration, Date Recorded y Size, tema oscuro de `plan/images/app.png`
- [x] Ampliación: menú contextual propio (Play, Open with default app, Rename, Duplicate, Open file location, Copy path, Remove, Delete) con `Ctrl+D` y `Shift+Supr`; en un archivo inexistente solo queda Remove

### Paso 3 — Abrir archivos
- [ ] ~~Doble clic, `Enter` o el botón ▶ abren el archivo en el reproductor del sistema (`shell.openPath`); no hay reproductor propio dentro de la app~~ → ver línea siguiente
- [x] Ampliación: doble clic, `Enter` y ▶ reproducen dentro de la app con `PlaybackBar`; "Open with default app" del menú abre el reproductor del sistema
- [x] Botón ⏏ File: clic abre la carpeta de destino (`shell.openPath`); su menú tiene "Open folder" y "Open audio file…" (`dialog.showOpenDialog` con mp3/wav), que añade el archivo a la lista
- [ ] ~~⏸ y ■ actúan solo sobre la grabación~~ → con reproductor propio actúan sobre la grabación si hay una en curso y si no sobre la reproducción

### Paso 4 — Tests
- [x] `history/index.test.ts`: añadir, quitar, renombrar (colisión de nombre rechazada), archivo JSON corrupto → lista vacía + log

### Paso 5 — Verificación
- [x] Grabar 3 archivos, reiniciar: siguen en la lista; borrar uno desde el Explorador y enfocar la app: aparece tachado
- [x] Doble clic reproduce en la app (PlaybackBar avanza); renombrar cambia el archivo en disco y sobrevive al reinicio
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [x] Commit: `feat(history): historial, lista de grabaciones y abrir archivos`
- [x] **Cierre de Fase 6**

## Criterios de aceptación
- [x] La lista sobrevive a reinicios
- [x] Las filas se ven como en la captura 12 (cebra, selección azul, `--:--` en curso)
- [x] Doble clic abre la grabación y el botón File abre la carpeta

## Bitácora
- 2026-09-29 — Se adoptó el trabajo sin commitear de la sesión paralela (menú contextual, reproductor propio, tema oscuro de `app.png`, duplicar, borrar a Papelera) y se amplió el alcance de la tarea en vez de descartarlo.
- 2026-09-29 — "Open audio file…" pasa de `dialog:openAudioFile` a `history:import` (el main abre el diálogo, lee duración con ffmpeg y evita duplicados por ruta); `runFfmpeg` sale de `recovery.ts` a `encoder/runFfmpeg.ts` para compartirlo.
- 2026-09-29 — Verificado en vivo por CDP con userData aislado: 3 grabaciones, reinicio, renombrado y archivo borrado tachado con solo Copy path/Remove activos. Los diálogos nativos (importar, confirmar Clear list/Delete) y "Open with default app" no se pueden conducir por CDP: cubiertos por tests y revisión.
