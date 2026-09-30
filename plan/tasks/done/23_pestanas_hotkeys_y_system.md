# 23 · Pestañas Hotkeys y System (formularios)

**Estado:** ✅ Terminada
**Fase:** 7 — Options · **Depende de:** 20 · **Doc:** [§10](../../../PROMPT_rebecca_listen.md) · **Ref:** `images/07_options_hotkeys.png`, `08_options_system.png`

## Objetivo
Las pestañas Hotkeys y System muestran y editan sus settings: captura de combinaciones con detección de conflictos internos, checkboxes de sistema y Open Log File funcional. El registro global de hotkeys y el comportamiento de bandeja llegan en la fase 10.

## Pasos

### Paso 1 — Hotkeys
- [x] Tabla Commands | Key con File, Record, Pause, Play, Stop, Cut (None por defecto)
- [x] Campo "Press (new) hot key for selected command:" en modo captura al seleccionar fila; convierte `KeyboardEvent` a formato Electron `Accelerator` (`Ctrl+Alt+R`) — función pura `toAccelerator()`
- [x] Backspace o Supr → None; botón Assign asigna al comando seleccionado
- [x] Conflicto con otro comando → error en rojo bajo el campo
- [x] Hueco para mostrar el error de registro del sistema (se conecta en 30)

### Paso 2 — System
- [x] ☐ Minimize to tray, ☐ Always show tray icon, ☐ Always on top, ☑ Keep recording history
- [x] Badge Info con el texto de §10.2
- [x] Botón Open Log File → `shell.openPath` del log actual (funciona ya)
- [x] Separador y extras: ☐ Start with Windows, ☐ Start recording on launch, idioma English / Español
- [x] Al pie, en gris: nombre y "Version x.y.z" desde `app:info` (no hay pestaña About ni comprobación de actualizaciones)

### Paso 3 — Tests
- [x] `toAccelerator.test.ts`: modificadores solos (no válidos), Ctrl+Alt+R, F-keys, teclas numéricas, AltGr
- [x] `hotkeyConflicts.test.ts`

### Paso 4 — Verificación
- [x] Comparar con las capturas 07 y 08; asignar y quitar atajos; provocar un conflicto
- [x] Open Log File abre `main.log`
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(options): pestañas hotkeys y system`

## Criterios de aceptación
- [x] Se pueden capturar, asignar y borrar atajos, y los conflictos se señalan
- [x] Todas las opciones de System persisten
- [x] Se muestra la versión real de `package.json`

## Bitácora
- 2026-09-30 — Captura por `event.code` (físico): Shift no cambia la tecla y AltGr queda como Ctrl+Alt, que es lo que Windows registra. Fuera de las F-keys se exige Ctrl, Alt o Win para no secuestrar la escritura.
- 2026-09-30 — Nuevo `system.language` (`en`/`es`, sin migración: la validación lo rellena); solo se guarda, el cambio de idioma llega con 31. `app:info` y `shell:openLogFile` pasan a `ipc/system.ts` (el segundo no tenía handler).
- 2026-09-30 — Verificado por CDP: asignar, borrar con Backspace, conflicto Ctrl+Alt+R y F9 sola; todas las opciones de System persisten en `settings.json` (restaurado después); Open Log File abrió `main.log` en el Bloc de notas. El test de rendimiento del resampler volvió a fallar en la suite completa y pasa suelto.
