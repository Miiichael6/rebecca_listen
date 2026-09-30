# 43 · Barra de transporte unificada (Play/Pausa en un solo botón)

**Estado:** ⬜ Después
**Fase:** 6 — Lista · **Depende de:** 13, 17, 42 · **Doc:** petición del usuario (2026-09-30)

## Objetivo
La `TransportBar` pierde sus botones repetidos: Play y Pausa pasan a ser uno solo y el Stop cuadrado desaparece. Queda la carpeta siempre visible, el botón rojo Grabar/Detener y un botón Play/Pausa que cambia de icono según el contexto.

## Diseño acordado
- **Carpeta:** siempre visible.
- **Grabar/Detener (rojo):** siempre visible, sin cambios. No se oculta al seleccionar un archivo: la selección persiste y, si se ocultara, no se podría grabar sin deseleccionar.
- **Play/Pausa (un botón):**

  | Situación | Icono | Acción |
  |---|---|---|
  | Grabando | ⏸ | Pausar la grabación |
  | Grabación en pausa | ▶ | Reanudar |
  | Reproduciendo el archivo seleccionado | ⏸ | Pausar |
  | Reproducción en pausa, o archivo seleccionado sin reproducir (o distinto del que suena) | ▶ | Reproducir |
  | Nada seleccionado y sin grabar | ▶ | Visible pero apagado (para que la barra no se mueva) |

- **Stop cuadrado:** se quita. La reproducción termina sola y Pausa cubre el resto; la grabación se detiene con el rojo. Se pierde "parar y volver al inicio" en la reproducción.

## Pasos
- [ ] Dominio: función pura que, con estado de sesión, reproducción y selección, da el modo del botón (`play` / `pause` / `off`), su acción y su título; con test
- [ ] `TransportBar`: un solo botón Play/Pausa con `onPlayPause`; quitar el Stop cuadrado y `onStop` suelto
- [ ] `useMainWindow`: fusionar `onPlay` y `onPause` en `onPlayPause`
- [ ] Revisar `TransportBar.module.css` y el comentario de cabecera del componente
- [ ] Verificación en la app real (ver memoria de Electron): grabar → pausar → reanudar → detener; seleccionar archivo → play → pausa → play; cambiar de archivo mientras suena
- [ ] `tsc`, lint y tests en verde
- [ ] Commit: `refactor(ui): botón Play/Pausa unificado y sin Stop suelto`

## Criterios de aceptación
- [ ] La barra tiene carpeta, Grabar/Detener y un solo Play/Pausa
- [ ] Grabando, el botón pausa y reanuda la grabación
- [ ] Con un archivo seleccionado, reproduce y pausa ese archivo
- [ ] Sin selección y sin grabar, el botón se ve apagado

## Bitácora
- 2026-09-30 — Propuesta razonada y acordada con el usuario; se deja para después. Pendiente de confirmar por el usuario: quitar el Stop cuadrado y dejar el botón apagado (no oculto) sin selección; quedaron como recomendación.
