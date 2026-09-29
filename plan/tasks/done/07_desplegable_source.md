# 07 · Desplegable Source completo

**Estado:** ✅ Terminada
**Fase:** 2 — Dispositivos · **Depende de:** 04, 06 · **Doc:** [§4.1](../../PROMPT_rebecca_listen.md) · **Ref:** `images/01_source_dropdown_devices.png`

## Objetivo
El combo Source muestra los tres modos rápidos, la barra teal "•••" y la lista avanzada agrupada por hardware con colores, se actualiza en vivo y guarda la elección en settings.

## Pasos

### Paso 1 — Desplegable
- [x] Popover propio (no `<select>`) en `components/SourcePicker/` con navegación por teclado (flechas, Enter, Esc)
- [x] Modos rápidos Computer Sounds / Voice / Computer Sounds & Voice con check verde en el seleccionado
- [x] Botón "?" en Computer Sounds & Voice con tooltip: se mezcla la salida por defecto con el micrófono por defecto
- [x] Barra teal `#127C8C` con "•••" que expande/colapsa la lista avanzada (estado recordado en settings)
- [x] Grupos con cabecera gris (`groupName`); endpoints en verde (render, loopback) o rojo (capture)
- [x] Solo se listan dispositivos usables ahora (ver 05): no hay filas grises "Not plugged in" ni ítems no seleccionables

### Paso 2 — Estado y persistencia
- [x] Al elegir, `source:set` guarda `SourceSelection` en settings; al arrancar se restaura
- [x] Si el dispositivo guardado ya no está en la lista (desconectado o renombrado), el combo lo muestra con aviso y cae a Computer Sounds al grabar (log)
- [x] Prop `disabled` para el estado de grabación (se conecta en 13)

### Paso 3 — Verificación
- [x] Comparar con `01_source_dropdown_devices.png` con los dispositivos reales del equipo
- [ ] Conectar/desconectar audífonos con el desplegable abierto: la lista cambia sin cerrarse ni perder la selección — simulado con `devices:changed` desde main; la prueba física queda pendiente (ver Bitácora)
- [x] Reiniciar la app: la selección persiste
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [x] Commit: `feat(ui): desplegable source con dispositivos y hot-plug`
- [x] **Cierre de Fase 2**

## Criterios de aceptación
- [x] El desplegable coincide visualmente con la captura 01 (modos, barra teal, grupos, colores)
- [ ] Todo lo que aparece en la lista se puede grabar; al desconectar un dispositivo desaparece en 2 s o menos — la UI reacciona al evento al instante y el sondeo de 2 s está testeado; falta la prueba con hardware
- [x] La elección sobrevive a un reinicio

## Bitácora
- 2026-09-29 — El estado del "•••" se guarda en `StoredSettings.ui` (canales `ui:get`/`ui:set`), no en `Settings`: es estado de ventana como `window.bounds`, no una opción; empieza colapsado.
- 2026-09-29 — La caída a Computer Sounds vive en `resolveForRecording` (main, testeada) y la grabación guarda en el historial la fuente real usada; no se probó grabando para no dejar archivos en el Escritorio.
- 2026-09-29 — Hot-plug verificado inyectando `devices:changed` desde main por el inspector (lista abierta, fila activa conservada, aviso "Device not connected"); sin audífonos ni admin, la prueba física de 06 y 07 queda para hacerla a mano.
