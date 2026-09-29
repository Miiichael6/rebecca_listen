# 36 · Pruebas de aceptación y rendimiento

**Estado:** ⬜ Pendiente
**Fase:** 12 — Empaquetado · **Depende de:** 35 · **Doc:** [§16](../../PROMPT_rebecca_listen.md)

## Objetivo
Los criterios de aceptación de §16 que corresponden al núcleo (grabación, mezcla, desconexión, recuperación y rendimiento) se comprueban sobre la app empaquetada y sus resultados quedan documentados en `plan/ACCEPTANCE.md`.

## Pasos

### Paso 1 — Pruebas funcionales (app empaquetada)
- [ ] 10 min de Computer Sounds en MP3 192 kbps → ≈ 14 MB, reproducible, sin cortes
- [ ] 30 min de Computer Sounds & Voice con claqueta al inicio y al final → desfase medido en Audacity y anotado (ver la decisión de la tarea 16)
- [ ] Desconectar los audífonos seleccionados grabando → archivo sano + aviso
- [ ] Matar la app grabando → al reiniciar el archivo aparece ya recuperado
- [ ] 10 min de Voice en WAV 16 bits → se abre y suena bien

### Paso 2 — Rendimiento
- [ ] CPU < 5 % en grabación simple (Administrador de tareas / `app.getAppMetrics()`), anotar main + renderer + sidecar + ffmpeg
- [ ] 1 h de grabación: memoria estable (muestras cada 5 min, sin crecimiento sostenido)
- [ ] Si algo falla, corregirlo aquí; si son varios problemas grandes, proponer subtareas

### Paso 3 — Documentación
- [ ] `plan/ACCEPTANCE.md` con cada criterio, fecha, método, resultado y evidencias (cifras)
- [ ] Actualizar `README.md` del proyecto: qué es, cómo desarrollar (`build:native`, `dev`, `test`), cómo empaquetar

### Paso 4 — Verificación
- [ ] Los criterios del núcleo en verde en `ACCEPTANCE.md`; los de hotkeys y bandeja quedan anotados como "pendientes (tareas en despues/)" y los de VAS, FLL, AGC y Trim como "fuera de alcance"
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; la app instalada arranca
- [ ] Commit: `test(acceptance): criterios de aceptación y rendimiento verificados`
- [ ] **Cierre de Fase 12**

## Criterios de aceptación
- [ ] Los 5 criterios de §16 del núcleo (10 min MP3, mezcla, desconexión, `.part`, CPU/memoria) se cumplen y están documentados con cifras
- [ ] No hay fugas de memoria en 1 h de grabación
- [ ] El README explica cómo compilar y empaquetar desde cero

## Bitácora
- _(fecha — nota)_
