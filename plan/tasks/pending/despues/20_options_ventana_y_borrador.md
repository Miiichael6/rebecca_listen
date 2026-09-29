# 20 · Ventana Options, pestañas y borrador Apply/OK/Cancel

**Estado:** ⬜ Pendiente
**Fase:** 7 — Options · **Depende de:** 03, 04 · **Doc:** [§5](../../../PROMPT_rebecca_listen.md) · **Ref:** `images/05_options_files_autoname.png`, `07_options_hotkeys.png`, `08_options_system.png`

## Objetivo
El engranaje abre una ventana modal Options con tres pestañas de color (Files, Hotkeys, System) y botones OK / Cancel / Apply, editando siempre sobre un borrador que solo se persiste al aplicar.

## Pasos

### Paso 1 — Ventana
- [ ] `src/main/windows/options.ts`: `BrowserWindow` hija modal de la principal, 440×560, no redimensionable, título "Options", mismas `webPreferences` seguras; una sola instancia (si ya existe, se enfoca)
- [ ] Carga el mismo bundle del renderer con `#/options?tab=<id>` para poder abrir una pestaña concreta
- [ ] IPC `options:open { tab? }`

### Paso 2 — Estructura
- [ ] `windows/Options/OptionsWindow.tsx` con pestañas Files (azul claro), Hotkeys (rosa) y System (verde claro) — colores medidos de las capturas y puestos como variables CSS
- [ ] Cada pestaña con encabezado en negrita y separador inferior; contenido provisional "TODO" (se rellena en 22 y 23)

### Paso 3 — Borrador
- [ ] `store/optionsDraft.ts`: copia profunda de los settings al abrir; `isDirty`; `apply()` → `settings:set`; `reset()`
- [ ] OK = apply + cerrar; Cancel = descartar + cerrar; Apply deshabilitado si no hay cambios
- [ ] Cerrar con la X con cambios sin aplicar = Cancel
- [ ] Si hay grabación en curso y cambian formato o carpeta, texto pequeño "Applies from the next file"

### Paso 4 — Verificación
- [ ] Abrir Options, cambiar algo en una pestaña de prueba, Cancel: nada cambia; Apply: persiste y se desactiva Apply
- [ ] Comparar colores de pestañas con las capturas 05, 07 y 08
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(options): ventana options con pestañas y borrador`

## Criterios de aceptación
- [ ] Options es modal, 440×560 y no redimensionable
- [ ] Ningún cambio se guarda sin Apply u OK
- [ ] Se puede abrir directamente en cualquiera de las tres pestañas

## Bitácora
- _(fecha — nota)_
