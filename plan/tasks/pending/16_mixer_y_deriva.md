# 16 · Mezcla de sistema + micrófono

**Estado:** ⬜ Pendiente
**Fase:** 5 — Mezcla · **Depende de:** 13, 15 · **Doc:** [§2.1, §4.1, §16](../../PROMPT_rebecca_listen.md)

## Objetivo
El modo "Computer Sounds & Voice" abre dos streams (loopback por defecto + micrófono por defecto), los lleva a una tasa común y los mezcla en un solo archivo. La deriva de reloj entre dispositivos se **mide primero** con el hardware real, y solo se compensa si resulta que molesta.

## Pasos

### Paso 1 — Mixer (`src/main/audio/mixer.ts`)
- [ ] El loopback es el reloj maestro; el micrófono pasa por un FIFO y un `Resampler` (15) hacia la tasa y canales del maestro (mono → estéreo duplicando)
- [ ] Underrun → rellenar con ceros y log; overrun → descartar lo más viejo y log
- [ ] Suma con ganancia por fuente (0 dB por defecto) y limitador suave para no clipear
- [ ] `session.ts` y `monitor.ts` usan el mixer cuando `source.mode === 'mixed'`; si un dispositivo se pierde, `DEVICE_LOST` como en 13

### Paso 2 — Medición de deriva
- [ ] Contar los frames recibidos de cada stream y registrar cada 60 s el desfase acumulado en ms y el ppm implícito
- [ ] Registrar también el llenado del FIFO para ver si crece o se vacía de forma sostenida

### Paso 3 — Prueba con hardware real
- [ ] Grabar 30 min en modo mixto con una palmada al principio y otra al final, con el micro y la salida que vayas a usar normalmente
- [ ] Medir en Audacity el desfase entre ambas palmadas y anotarlo en Bitácora junto al ppm del log
- [ ] Repetir con audífonos Bluetooth o micro USB si los usas, que es donde más deriva suele haber

### Paso 4 — Compensar solo si hace falta
- [ ] Si el desfase pasa de ~20 ms en 30 min: control proporcional suave sobre `setRatioAdjust(ppm)` según el llenado del FIFO (objetivo ~40 ms de buffer) y repetir la prueba del paso 3
- [ ] Si no llega a ese desfase: dejarlo sin compensar y anotar en Bitácora la medida que lo justifica

### Paso 5 — Tests
- [ ] Simulación con esclavo a 48000 × (1 + 150 ppm): la medición del paso 2 informa ~150 ppm
- [ ] Esclavo mono 44.1 k + maestro estéreo 48 k: la salida tiene la tasa y canales del maestro
- [ ] Underrun y overrun no lanzan excepciones
- [ ] Si se implementó el paso 4: tras 30 min simulados, un impulso inyectado a la vez en ambos aparece con desfase < 20 ms

### Paso 6 — Verificación
- [ ] Grabar 5 min hablando encima de un vídeo: voz y sistema suenan juntos, sin clics ni cortes
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [ ] Commit: `feat(audio): mezcla de sistema y micrófono`
- [ ] **Cierre de Fase 5**

## Criterios de aceptación
- [ ] El modo mixto graba ambas fuentes en un solo archivo
- [ ] La deriva real del hardware está medida y anotada en Bitácora, con la decisión de compensar o no
- [ ] Sin clics ni cortes por underrun en uso normal

## Bitácora
- _(fecha — nota)_
