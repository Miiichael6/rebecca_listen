# 38 · Elegir la carpeta de las grabaciones

**Estado:** ✅ Terminada
**Fase:** 6 — Lista · **Depende de:** 12, 17 · **Doc:** [§9](../../../PROMPT_rebecca_listen.md) (carpeta de Auto Name)

## Objetivo
El usuario elige dónde se guardan sus grabaciones sin esperar a la ventana Options: "Change folder…" en el menú del botón ⏏ File, con la carpeta actual a la vista.

## Pasos

### Paso 1 — Main
- [x] `naming.ts`: exportar la comprobación de escritura (`checkWritableFolder`) para validar la carpeta elegida
- [x] `ipc/files.ts`: `files:getFolder` (carpeta en uso, la de por defecto si el ajuste está vacío) y `files:chooseFolder` (selector nativo → comprobar escritura → guardar `files.folder`)
- [x] Quitar `dialog:selectFolder`, declarado sin manejador; la tarea 22 reutilizará `files:chooseFolder`

### Paso 2 — Renderer
- [x] `FileButton`: "Change folder…" en el menú y la carpeta actual como título del menú y del botón
- [x] Aviso "Recordings will be saved in <carpeta>"; una grabación en curso sigue en su carpeta

### Paso 3 — Orden del código (pedido por el usuario)
- [x] `components/RecordingList/`: `RecordingList`, `FileName`, `NameEditor`, `menuItems.ts` y `listKeys.ts` (teclas y `baseName`, puro y con test)
- [x] `components/ContextMenu/`: `ContextMenu`, `MenuRow`, `Submenu`, `types.ts` y `menuNavigation.ts` (puro y con test)
- [x] `components/TagEditor/` y `main/history/edits/` (`audioEdits`, `tags`, `transcodeArgs` con sus tests)
- [x] Tarea 22 apunta a `files:chooseFolder` en vez de un `dialog:pickFolder` nuevo

### Paso 4 — Verificación
- [x] Test de `checkWritableFolder`, `listKeys` y `menuNavigation`; `npm run typecheck`, `npx eslint src`, `npx vitest run` (285 tests)
- [ ] En vivo: elegir carpeta, grabar, comprobar que el archivo cae en ella y que persiste al reiniciar
- [x] Commit: `feat(files): elegir la carpeta de las grabaciones`

## Criterios de aceptación
- [x] Desde el menú ⏏ File se cambia la carpeta y las siguientes grabaciones van a ella
- [x] Una carpeta sin permiso de escritura se rechaza con un aviso y no se guarda
- [x] La carpeta elegida sobrevive a reinicios

## Bitácora
- 2026-09-29 — Se adelanta la parte "carpeta" de la tarea 22 a petición del usuario; el resto de la pestaña Files sigue aplazado.
- 2026-09-29 — Sin prueba en vivo: el selector de carpetas es nativo y CDP no lo maneja, y forzar el cierre de Electron abrió el depurador JIT de Visual Studio. Se comprobó por código que `appSession.nextFile` lee `files.folder` en cada archivo y que el ajuste se guarda en `settings.json`; queda para que el usuario lo pruebe.
- 2026-09-29 — Con la tarea se reorganizaron en carpetas los componentes que había hecho crecer la 37, a petición del usuario.
