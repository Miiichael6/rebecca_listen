# 07 · Desplegable Source completo

**Estado:** ⬜ Pendiente
**Fase:** 2 — Dispositivos · **Depende de:** 04, 06 · **Doc:** [§4.1](../../PROMPT_rebecca_listen.md) · **Ref:** `images/01_source_dropdown_devices.png`

## Objetivo
El combo Source muestra los tres modos rápidos, la barra teal "•••" y la lista avanzada agrupada por hardware con colores, se actualiza en vivo y guarda la elección en settings.

## Pasos

### Paso 1 — Desplegable
- [ ] Popover propio (no `<select>`) en `components/SourcePicker/` con navegación por teclado (flechas, Enter, Esc)
- [ ] Modos rápidos Computer Sounds / Voice / Computer Sounds & Voice con check verde en el seleccionado
- [ ] Botón "?" en Computer Sounds & Voice con tooltip: se mezcla la salida por defecto con el micrófono por defecto
- [ ] Barra teal `#127C8C` con "•••" que expande/colapsa la lista avanzada (estado recordado en settings)
- [ ] Grupos con cabecera gris (`groupName`); endpoints en verde (render, loopback) o rojo (capture)
- [ ] Solo se listan dispositivos usables ahora (ver 05): no hay filas grises "Not plugged in" ni ítems no seleccionables

### Paso 2 — Estado y persistencia
- [ ] Al elegir, `source:set` guarda `SourceSelection` en settings; al arrancar se restaura
- [ ] Si el dispositivo guardado ya no está en la lista (desconectado o renombrado), el combo lo muestra con aviso y cae a Computer Sounds al grabar (log)
- [ ] Prop `disabled` para el estado de grabación (se conecta en 13)

### Paso 3 — Verificación
- [ ] Comparar con `01_source_dropdown_devices.png` con los dispositivos reales del equipo
- [ ] Conectar/desconectar audífonos con el desplegable abierto: la lista cambia sin cerrarse ni perder la selección
- [ ] Reiniciar la app: la selección persiste
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [ ] Commit: `feat(ui): desplegable source con dispositivos y hot-plug`
- [ ] **Cierre de Fase 2**

## Criterios de aceptación
- [ ] El desplegable coincide visualmente con la captura 01 (modos, barra teal, grupos, colores)
- [ ] Todo lo que aparece en la lista se puede grabar; al desconectar un dispositivo desaparece en 2 s o menos
- [ ] La elección sobrevive a un reinicio

## Bitácora
- _(fecha — nota)_
