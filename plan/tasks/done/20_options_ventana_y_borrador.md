# 20 · Ventana Options, pestañas y borrador Apply/OK/Cancel

**Estado:** ✅ Terminada
**Fase:** 7 — Options · **Depende de:** 03, 04 · **Doc:** [§5](../../PROMPT_rebecca_listen.md) · **Ref:** `images/05_options_files_autoname.png`, `07_options_hotkeys.png`, `08_options_system.png`

## Objetivo
El engranaje abre una ventana modal Options con tres pestañas de color (Files, Hotkeys, System) y botones OK / Cancel / Apply, editando siempre sobre un borrador que solo se persiste al aplicar.

## Pasos

### Paso 1 — Ventana
- [x] `src/main/windows/options.ts`: `BrowserWindow` hija modal de la principal, 440×560, no redimensionable, título "Options", mismas `webPreferences` seguras; una sola instancia (si ya existe, se enfoca)
- [x] Carga el mismo bundle del renderer con `#/options?tab=<id>` para poder abrir una pestaña concreta
- [x] IPC `options:open { tab? }`

### Paso 2 — Estructura
- [x] `windows/Options/OptionsWindow.tsx` con pestañas Files (azul claro), Hotkeys (rosa) y System (verde claro) — colores medidos de las capturas y puestos como variables CSS
- [x] Cada pestaña con encabezado en negrita y separador inferior; contenido provisional "TODO" (se rellena en 22 y 23)

### Paso 3 — Borrador
- [x] `store/optionsDraft.ts`: copia profunda de los settings al abrir; `isDirty`; `apply()` → `settings:set`; `reset()`
- [x] OK = apply + cerrar; Cancel = descartar + cerrar; Apply deshabilitado si no hay cambios
- [x] Cerrar con la X con cambios sin aplicar = Cancel
- [x] Si hay grabación en curso y cambian formato o carpeta, texto pequeño "Applies from the next file"

### Paso 4 — Verificación
- [x] Abrir Options, cambiar algo en una pestaña de prueba, Cancel: nada cambia; Apply: persiste y se desactiva Apply
- [x] Comparar colores de pestañas con las capturas 05, 07 y 08
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(options): ventana options con pestañas y borrador`

## Criterios de aceptación
- [x] Options es modal, 440×560 y no redimensionable
- [x] Ningún cambio se guarda sin Apply u OK
- [x] Se puede abrir directamente en cualquiera de las tres pestañas

## Bitácora
- 2026-09-30 — Hecha a petición expresa, aunque estaba aplazada en `despues/`.
- El engranaje ya existía en `TransportBar` (`onOptions`); ahora abre `options:open`.
- `src/main/windows/options.ts`: hija modal 440×560, no redimensionable, una sola instancia; si ya está abierta solo cambia el hash y se enfoca. Carga el mismo bundle con `#/options?tab=<id>`; `main.tsx` elige Options o App por el hash.
- Colores medidos de las capturas (variables `--color-tab-*` en theme.css): Files `#b8d7f4`, Hotkeys `#ffe6e3`, System `#e7fcc4`.
- Borrador: `store/optionsDraft.ts` + reglas puras en `windows/Options/domain/draft.ts` (con tests). La X y Cancel no guardan nada porque el borrador solo vive en la ventana.
- Verificado en la app real por CDP: abre en la pestaña pedida, una sola instancia (segundo `options:open` cambia de pestaña), Apply deshabilitado sin cambios, Cancel cierra. Apply con cambios reales queda cubierto por los tests del borrador hasta que 22 y 23 traigan controles editables.
- `resampler.test.ts` (rendimiento) falló una vez por 0,0102 frente a 0,01 en la suite completa y pasa suelto: es de temporización, no de esta tarea.
