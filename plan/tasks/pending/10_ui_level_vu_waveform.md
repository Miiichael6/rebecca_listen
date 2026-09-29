# 10 · UI de Level, VU meter y waveform en vivo

**Estado:** ⬜ Pendiente
**Fase:** 3 — Captura y monitoreo · **Depende de:** 04, 09 · **Doc:** [§4.2, §4.3](../../PROMPT_rebecca_listen.md) · **Ref:** `images/12_main_window_recording.png`

## Objetivo
El slider Level controla la ganancia en tiempo real, el VU meter estéreo muestra el nivel con colores y peak hold, y la waveform se desplaza en vivo; todo funciona ya en estado Ready.

## Pasos

### Paso 1 — Level
- [ ] `LevelSlider`: 0–200 %, 100 % en el centro, azul `#1E7BC4`; doble clic resetea a 100 %
- [ ] Envía `level:set` con throttle (~30 Hz) y muestra el % en tooltip

### Paso 2 — VU meter
- [ ] Dos filas L/R de 40 segmentos; verde hasta −12 dBFS, amarillo hasta −3 dBFS, rojo encima (umbrales en `defaults.ts`)
- [ ] Peak hold de 1 s con caída lenta; fuente mono → ambas filas iguales
- [ ] Render en canvas o con divs memoizados (sin re-render de React a 30 fps por segmento)

### Paso 3 — Waveform
- [ ] `Waveform` en `<canvas>` con `requestAnimationFrame`: buffer circular de columnas, scroll continuo de derecha a izquierda, relleno azul espejado sobre la línea central, rejilla gris tenue
- [ ] Escalado por `devicePixelRatio` y redimensionado con `ResizeObserver`
- [ ] Método `freeze()` para el estado de pausa (se usa en 13)

### Paso 4 — Verificación
- [ ] Con música sonando en Ready: el VU se mueve, los picos se quedan 1 s, la waveform avanza fluida
- [ ] Subir el Level a 200 % hace que el VU llegue al rojo; doble clic lo devuelve a 100 %
- [ ] DevTools > Performance: sin tirones ni fugas tras 2 min
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [ ] Commit: `feat(ui): level, vu meter y waveform en vivo`
- [ ] **Cierre de Fase 3**

## Criterios de aceptación
- [ ] VU meter y waveform reaccionan al audio real en estado Ready
- [ ] El Level altera la señal en tiempo real y se resetea con doble clic
- [ ] La animación es fluida (≈60 fps de dibujo, datos a 30 fps)

## Bitácora
- _(fecha — nota)_
