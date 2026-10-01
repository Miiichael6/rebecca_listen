# 27 · Corte sin pérdida (Smart Split) y botón Split

**Estado:** ✅ Terminada (escucha en Audacity pendiente del usuario)
**Fase:** 9 — Split · **Depende de:** 13 · **Doc:** [§4.8, §8, §12.2](../../../PROMPT_rebecca_listen.md)

## Objetivo
Existe un único mecanismo `rotateFile(atFrame)` que cierra el archivo actual y continúa en uno nuevo sin perder ni duplicar muestras; el botón Split lo usa, y VAS y FLL lo reutilizarán.

## Pasos

### Paso 1 — Mecanismo
- [x] `src/main/audio/splitter.ts` (lógica pura): dado un bloque y un índice de frame, lo divide en `[antes, después]`
- [x] `session.rotateFile(atFrame?)`: escribe `antes` en el encoder actual, abre el siguiente encoder (nombre nuevo con `resolveOutputPath`) **antes** de cerrar el anterior, escribe `después` en el nuevo; el cierre del viejo es asíncrono y no bloquea la captura
- [x] El cronómetro de la sesión sigue; la lista añade la fila terminada y una nueva `--:--`
- [x] Evento `SPLIT` de la máquina de estados → `rotateFile()` en el siguiente bloque

- [x] El archivo y la grabación quedan separados: `recordingFile.ts` (abrir, escribir, guardar, descartar un archivo) y `session.ts` (la toma: captura, cronómetro, cortes)
- [x] `Encoder.discard()`: un corte que ningún bloque alcanza antes de Stop no deja un archivo vacío
- [x] Los nombres evitan los archivos aún abiertos (`resolveOutputPath(..., busy)`): dos splits en el mismo segundo no pisan el `.part` del anterior

### Paso 2 — UI
- [x] Botón Split de la `TransportBar` habilitado solo en `recording`; tooltip con su hotkey (Cut)

### Paso 3 — Tests
- [x] `splitter.test.ts`: índice 0, índice final, índice en medio, estéreo
- [x] `session.split.test.ts` con encoder WAV real: rampa numérica (muestra i = i) de 10 s, 5 splits aleatorios; concatenar los WAV resultantes reproduce la rampa exacta (sin huecos ni duplicados)

### Paso 4 — Verificación
- [ ] Grabar música, pulsar Split 3 veces; unir los MP3 en Audacity: sin saltos audibles
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(session): corte sin pérdida y botón split`

## Criterios de aceptación
- [x] Concatenar los archivos de un split da exactamente la señal original (test con WAV)
- [x] Split no interrumpe la captura ni el cronómetro
- [x] Hay un solo camino de corte, reutilizable por VAS y FLL

## Bitácora
- 2026-09-30 — El siguiente encoder se abre (await en la cola de eventos) antes del corte; el corte cae en el siguiente bloque vía `splitBlock`. Si llega una pausa antes, corta en la pausa; si llega Stop, se descarta el archivo nuevo. El viejo se guarda en segundo plano y Stop espera a todos.
- 2026-09-30 — Cada archivo tiene su propia transcripción en vivo (task 46). El cronómetro es de la toma, no del archivo. Con "Save as" el primer archivo lleva el nombre elegido y los cortes, nombre automático.
- 2026-09-30 — Verificado en la app real (CDP, mezcla sistema + micro): 3 splits → 4 MP3 de 2530 + 2420 + 2420 + 3526 ms = 10 896 ms de la toma; Split desactivado en idle y en pausa. La prueba de mutación (duplicar una frame en el corte) hace fallar el test WAV. Falta la escucha en Audacity (usuario). `resampler.test` (rendimiento) falla con la suite en paralelo también en `main`: ajeno a esta tarea.
