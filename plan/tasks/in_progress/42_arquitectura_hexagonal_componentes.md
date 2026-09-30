# 42 · Arquitectura hexagonal en los componentes grandes

**Estado:** ✅ Terminada
**Fase:** 6 — Lista · **Depende de:** 17, 37 · **Doc:** petición del usuario (2026-09-30)

## Objetivo
`ContextMenu`, `SourcePicker`, `RecordingList` y `MainWindow` se separan en tres zonas: `domain/` (lógica pura, sin React ni `window`), `application/` (hooks y casos de uso que hablan con puertos) y la vista delgada. Lo que toca `window.api`, los stores o el portapapeles sale a `infrastructure/` y entra por un puerto.

## Pasos
- [x] `recordingCommands/`: dominio (`availability`), puerto, caso de uso `runRecordingCommand` y adaptador a stores + `window.api`; test con puerto falso
- [x] `RecordingList`: `domain/` (listKeys, menuItems sin iconos), `application/useRecordingList`, iconos en la vista
- [x] `ContextMenu`: `domain/` (types, menuNavigation), `application/useContextMenu`
- [x] `SourcePicker`: `domain/` (sourceOptions), `application/useSourcePicker`
- [x] `MainWindow`: `application/useMainWindow`, `infrastructure/` (suscripciones de frames, abrir carpeta)
- [x] `tsc`, lint y tests en verde; probar la UI (ver memoria de Electron)
- [x] Commit: `refactor(ui): arquitectura hexagonal en los componentes grandes`

## Criterios de aceptación
- [x] Nada en `domain/` importa React, `window` ni stores
- [x] Ningún componente ni hook de `application/` llama a `window.api` directamente
- [x] El comportamiento de la UI no cambia

## Bitácora
- 2026-09-30 — Alcance elegido por el usuario: solo los cuatro componentes más grandes del renderer; main y shared no se tocan.
- 2026-09-30 — Estructura resultante: `components/{ContextMenu,SourcePicker,RecordingList}/{domain,application}/` con la vista en la raíz de cada carpeta; `recordingCommands/{domain,application,infrastructure}/` (puerto `RecordingCommandsPort`, caso de uso con test de puerto falso, adaptador a stores + `window.api` + portapapeles); `windows/Main/{application,infrastructure}/` (`useMainWindow`, `mainApi`).
- 2026-09-30 — Desviaciones: el menú de `RecordingList` se construye sin iconos (`MenuItem<Icon>` genérico) y `menuIcons.ts` los añade en la vista. Los `ref` los crea la vista y se pasan al hook (la regla `react-hooks/refs` rechaza devolverlos dentro del objeto del hook). Se añadió al tablero la fila 41, que faltaba.
- 2026-09-30 — Verificación: tsc y eslint limpios; 55 tests del renderer en verde (nuevos: 9 de `runRecordingCommand`). En la app real (CDP): combo de Source abre con 16 opciones y se mueve con flechas; menú contextual con 12 ítems, submenú Convert to (MP3/WAV) con `→` y Esc cierra ambos. Fuera de alcance: `TagEditor` sigue llamando a `window.api` directamente; `resampler.test.ts` (main) falla por rendimiento (1,02 % frente a < 1 %), ajeno a este cambio.
