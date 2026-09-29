# 17 · Historial, lista de grabaciones y abrir archivos

**Estado:** ⬜ Pendiente
**Fase:** 6 — Lista · **Depende de:** 13 · **Doc:** [§4.5, §4.6, §4.8, §13](../../PROMPT_rebecca_listen.md) · **Ref:** `images/12_main_window_recording.png`

## Objetivo
Cada grabación terminada se añade a un historial persistente (`userData/history.json`) que la lista muestra con su estilo y selección; desde la lista se abre el archivo en el reproductor del sistema y desde el botón File se abre la carpeta de destino.

## Pasos

### Paso 1 — Servicio (`src/main/history.ts`)
- [ ] Items `{ id, path, name, format, durationMs, sizeBytes, createdAt, source }` (§13)
- [ ] `add`, `remove`, `rename(id, newName)` (renombra en disco y en la lista), `list`, `clear`
- [ ] Comprobación de existencia de cada archivo al cargar y al enfocar la ventana (`exists: boolean`)
- [ ] IPC `history:*` y evento `history:changed`
- [ ] La lista se guarda siempre (el interruptor "Keep recording history" llega con la 31, en `despues/`)

### Paso 2 — Lista (`components/RecordingList`)
- [ ] Filas cebra, nombre a la izquierda y duración `MM:SS` a la derecha; grabación en curso con `--:--` en azul
- [ ] Selección con barra vertical azul y texto azul; más reciente arriba
- [ ] Archivo inexistente → fila tachada en gris con icono de aviso
- [ ] Teclas: `Supr` quita de la lista, `Enter` abre el archivo, `F2` renombra en línea
- [ ] Badge contador de la `StatusBar` = total de filas

### Paso 3 — Abrir archivos
- [ ] Doble clic, `Enter` o el botón ▶ abren el archivo en el reproductor del sistema (`shell.openPath`); no hay reproductor propio dentro de la app
- [ ] Botón ⏏ File: clic abre la carpeta de destino (`shell.openPath`); su menú tiene "Open folder" y "Open audio file…" (`dialog.showOpenDialog` con mp3/wav), que añade el archivo a la lista
- [ ] ⏸ y ■ actúan solo sobre la grabación

### Paso 4 — Tests
- [ ] `history.test.ts`: añadir, quitar, renombrar (colisión de nombre rechazada), archivo JSON corrupto → lista vacía + log

### Paso 5 — Verificación
- [ ] Grabar 3 archivos, reiniciar: siguen en la lista; borrar uno desde el Explorador y enfocar la app: aparece tachado
- [ ] Doble clic abre la grabación en el reproductor de Windows; F2 renombra el archivo en disco
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [ ] Commit: `feat(history): historial, lista de grabaciones y abrir archivos`
- [ ] **Cierre de Fase 6**

## Criterios de aceptación
- [ ] La lista sobrevive a reinicios
- [ ] Las filas se ven como en la captura 12 (cebra, selección azul, `--:--` en curso)
- [ ] Doble clic abre la grabación y el botón File abre la carpeta

## Bitácora
- _(fecha — nota)_
