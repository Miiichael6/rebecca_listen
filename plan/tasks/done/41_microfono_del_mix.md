# 41 · Elegir el micrófono de "Computer Sounds & Voice"

**Estado:** ✅ Terminada (falta la prueba en vivo)
**Fase:** 6 — Lista · **Depende de:** 16, 07 · **Doc:** fallo reportado por el usuario

## Objetivo
El modo mixto deja de depender del micrófono predeterminado de Windows: se puede elegir cuál se mezcla con el sonido del computador.

## Pasos
- [x] `SourceSelection`: `mixed` admite `voiceId?`; `validateSource` lo conserva si es un texto no vacío
- [x] `resolveSource`: usa el micrófono elegido si sigue conectado y es de captura; si no, el predeterminado
- [x] UI: fila "Microphone" (`MicrophonePicker`) bajo Source, solo en modo mixto; volver a elegir el mix conserva el micrófono
- [x] Tests: `validate.test.ts`, `devices.test.ts`
- [ ] En vivo (usuario): con "CABLE Output" como predeterminado, elegir el micrófono real y oír la voz en la grabación
- [x] Commit: `feat(source): elegir el micrófono del modo mixto`

## Criterios de aceptación
- [ ] La voz elegida se graba junto al sonido del computador aunque el predeterminado sea un cable virtual
- [ ] Si el micrófono elegido se desconecta, se usa el predeterminado

## Bitácora
- 2026-09-30 — Causa: el log mostraba `"Auriculares" (render) + "CABLE Output" (capture)`; CABLE Output (VB-Cable) era el micrófono predeterminado y solo trae audio enviado a CABLE Input.
