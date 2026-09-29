# 23 · Pestañas Hotkeys y System (formularios)

**Estado:** ⬜ Pendiente
**Fase:** 7 — Options · **Depende de:** 20 · **Doc:** [§10](../../../PROMPT_rebecca_listen.md) · **Ref:** `images/07_options_hotkeys.png`, `08_options_system.png`

## Objetivo
Las pestañas Hotkeys y System muestran y editan sus settings: captura de combinaciones con detección de conflictos internos, checkboxes de sistema y Open Log File funcional. El registro global de hotkeys y el comportamiento de bandeja llegan en la fase 10.

## Pasos

### Paso 1 — Hotkeys
- [ ] Tabla Commands | Key con File, Record, Pause, Play, Stop, Cut (None por defecto)
- [ ] Campo "Press (new) hot key for selected command:" en modo captura al seleccionar fila; convierte `KeyboardEvent` a formato Electron `Accelerator` (`Ctrl+Alt+R`) — función pura `toAccelerator()`
- [ ] Backspace o Supr → None; botón Assign asigna al comando seleccionado
- [ ] Conflicto con otro comando → error en rojo bajo el campo
- [ ] Hueco para mostrar el error de registro del sistema (se conecta en 30)

### Paso 2 — System
- [ ] ☐ Minimize to tray, ☐ Always show tray icon, ☐ Always on top, ☑ Keep recording history
- [ ] Badge Info con el texto de §10.2
- [ ] Botón Open Log File → `shell.openPath` del log actual (funciona ya)
- [ ] Separador y extras: ☐ Start with Windows, ☐ Start recording on launch, idioma English / Español
- [ ] Al pie, en gris: nombre y "Version x.y.z" desde `app:info` (no hay pestaña About ni comprobación de actualizaciones)

### Paso 3 — Tests
- [ ] `toAccelerator.test.ts`: modificadores solos (no válidos), Ctrl+Alt+R, F-keys, teclas numéricas, AltGr
- [ ] `hotkeyConflicts.test.ts`

### Paso 4 — Verificación
- [ ] Comparar con las capturas 07 y 08; asignar y quitar atajos; provocar un conflicto
- [ ] Open Log File abre `main.log`
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(options): pestañas hotkeys y system`

## Criterios de aceptación
- [ ] Se pueden capturar, asignar y borrar atajos, y los conflictos se señalan
- [ ] Todas las opciones de System persisten
- [ ] Se muestra la versión real de `package.json`

## Bitácora
- _(fecha — nota)_
