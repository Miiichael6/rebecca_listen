# 30 · Hotkeys globales

**Estado:** ⬜ Pendiente
**Fase:** 10 — Sistema · **Depende de:** 23, 27 · **Doc:** [§10.1, §4.8, §16](../../../PROMPT_rebecca_listen.md)

## Objetivo
Los atajos asignados en Options se registran con `globalShortcut` y ejecutan File, Record, Pause, Play, Stop y Cut aunque la app esté en segundo plano o en la bandeja; los errores de registro se muestran en Options.

## Pasos

### Paso 1 — Servicio (`src/main/hotkeys.ts`)
- [ ] `applyHotkeys(map)`: `globalShortcut.unregisterAll()` y registrar cada accelerator distinto de None; devuelve `{ command, error }[]` para los que `register()` devuelve `false`
- [ ] Reaplicar al arrancar y al hacer Apply en Options; `unregisterAll()` en `will-quit`
- [ ] Mapear comandos: File → abrir carpeta de destino; Record → `RECORD` (nada si ya graba); Pause → pausar/reanudar; Play → abrir el último archivo en el reproductor del sistema; Stop → parar la grabación; Cut → `SPLIT`
- [ ] Log de registros y de fallos

### Paso 2 — UI
- [ ] Options › Hotkeys muestra en rojo "This shortcut is used by another application" si el sistema rechaza el registro
- [ ] Tooltips de la `TransportBar` incluyen el atajo asignado (`Record (Ctrl+Alt+R)`)

### Paso 3 — Tests
- [ ] `hotkeys.test.ts` con `globalShortcut` simulado: registra solo los asignados, informa fallos, reemplaza al reaplicar

### Paso 4 — Verificación
- [ ] Asignar Ctrl+Alt+R / P / S, minimizar la app y usar los atajos desde otra aplicación (y con la app en la bandeja cuando 31 esté hecha)
- [ ] Asignar un atajo ya usado por otra app (p. ej. uno de la barra de juegos) y comprobar el error
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(hotkeys): atajos globales`

## Criterios de aceptación
- [ ] Los seis comandos funcionan con la ventana sin foco
- [ ] Un atajo rechazado por el sistema se informa sin romper los demás
- [ ] Los tooltips muestran los atajos actuales

## Bitácora
- _(fecha — nota)_
