# 27 · Corte sin pérdida (Smart Split) y botón Split

**Estado:** ⬜ Pendiente
**Fase:** 9 — Split · **Depende de:** 13 · **Doc:** [§4.8, §8, §12.2](../../../PROMPT_rebecca_listen.md)

## Objetivo
Existe un único mecanismo `rotateFile(atFrame)` que cierra el archivo actual y continúa en uno nuevo sin perder ni duplicar muestras; el botón Split lo usa, y VAS y FLL lo reutilizarán.

## Pasos

### Paso 1 — Mecanismo
- [ ] `src/main/audio/splitter.ts` (lógica pura): dado un bloque y un índice de frame, lo divide en `[antes, después]`
- [ ] `session.rotateFile(atFrame?)`: escribe `antes` en el encoder actual, abre el siguiente encoder (nombre nuevo con `resolveOutputPath`) **antes** de cerrar el anterior, escribe `después` en el nuevo; el cierre del viejo es asíncrono y no bloquea la captura
- [ ] El cronómetro de la sesión sigue; la lista añade la fila terminada y una nueva `--:--`
- [ ] Evento `SPLIT` de la máquina de estados → `rotateFile()` en el siguiente bloque

### Paso 2 — UI
- [ ] Botón Split de la `TransportBar` habilitado solo en `recording`; tooltip con su hotkey (Cut)

### Paso 3 — Tests
- [ ] `splitter.test.ts`: índice 0, índice final, índice en medio, estéreo
- [ ] `session.split.test.ts` con encoder WAV real: rampa numérica (muestra i = i) de 10 s, 5 splits aleatorios; concatenar los WAV resultantes reproduce la rampa exacta (sin huecos ni duplicados)

### Paso 4 — Verificación
- [ ] Grabar música, pulsar Split 3 veces; unir los MP3 en Audacity: sin saltos audibles
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(session): corte sin pérdida y botón split`

## Criterios de aceptación
- [ ] Concatenar los archivos de un split da exactamente la señal original (test con WAV)
- [ ] Split no interrumpe la captura ni el cronómetro
- [ ] Hay un solo camino de corte, reutilizable por VAS y FLL

## Bitácora
- _(fecha — nota)_
