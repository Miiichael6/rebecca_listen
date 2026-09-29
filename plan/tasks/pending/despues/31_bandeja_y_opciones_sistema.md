# 31 · Bandeja, opciones de sistema e idioma

**Estado:** ⬜ Pendiente
**Fase:** 10 — Sistema · **Depende de:** 17, 23, 30 · **Doc:** [§10.2, §1.6, §16](../../../PROMPT_rebecca_listen.md) · **Ref:** `images/08_options_system.png`

## Objetivo
Las opciones de la pestaña System tienen efecto real: icono y menú de bandeja, minimizar a bandeja, siempre encima, historial opcional, arranque con Windows, grabar al iniciar e idioma English / Español.

## Pasos

### Paso 1 — Bandeja (`src/main/tray.ts`)
- [ ] Icono normal y rojo (grabando) en `resources/tray/`; tooltip con el tiempo transcurrido mientras graba
- [ ] Menú: Record / Stop (según estado), Pause, Open Rebecca Listen, Open recordings folder, Options, Exit
- [ ] Clic en el icono restaura la ventana
- [ ] El icono existe si "Always show tray icon" está activo o si la ventana está oculta en la bandeja

### Paso 2 — Opciones de ventana
- [ ] Minimize to tray: al minimizar, `hide()` y dejar solo el icono
- [ ] Always on top: `setAlwaysOnTop(value)` en caliente
- [ ] Cerrar la ventana mientras se graba pide confirmación (parar y guardar / cancelar)

### Paso 3 — Resto de System
- [ ] Keep recording history: al desmarcar, preguntar si borrar `history.json` (17)
- [ ] Start with Windows: `app.setLoginItemSettings({ openAtLogin })` (con `--hidden` si Minimize to tray)
- [ ] Start recording on launch: `RECORD` tras cargar dispositivos
- [ ] Idioma: `useT()` lee el idioma de settings; completar `es.json` con todas las claves de la app; cambiar idioma refresca ambas ventanas
- [ ] Test que compara las claves de `en.json` y `es.json` (ninguna falta)

### Paso 4 — Verificación
- [ ] Minimizar a bandeja durante una grabación: icono rojo con tiempo; los hotkeys de 30 funcionan desde la bandeja (criterio de §16)
- [ ] Reiniciar Windows con Start with Windows activo: la app arranca
- [ ] Cambiar a Español: toda la UI cambia sin textos en inglés sueltos
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [ ] Commit: `feat(system): bandeja, opciones de sistema e idioma`
- [ ] **Cierre de Fase 10**

## Criterios de aceptación
- [ ] Cada opción de System tiene efecto observable
- [ ] Los hotkeys funcionan con la app en la bandeja
- [ ] La app está completa en inglés y en español

## Bitácora
- _(fecha — nota)_
