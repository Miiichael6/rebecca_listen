# 14 · Recuperación de archivos `.part`

**Estado:** ⬜ Pendiente
**Fase:** 4 — Grabación · **Depende de:** 13 · **Doc:** [§3.3, §16](../../PROMPT_rebecca_listen.md)

## Objetivo
Si la app se cierra a la fuerza durante una grabación, al volver a arrancar repara sola los `.part` huérfanos y los deja como archivos reproducibles, sin preguntar nada al usuario.

## Pasos

### Paso 1 — Registro de grabaciones abiertas
- [ ] Al abrir un encoder, guardar en `userData/open-recordings.json` la ruta del `.part`, formato, tasa y canales; quitarla al cerrar bien
- [ ] Al arrancar, combinar esa lista con un escaneo de `*.part` en la carpeta de destino activa

### Paso 2 — Reparación automática
- [ ] `src/main/files/recovery.ts`: por formato
  - MP3: remux con ffmpeg (`-c copy`, `-err_detect ignore_err`) a un archivo final
  - WAV: reescribir la cabecera RIFF con el tamaño real (o remux con ffmpeg)
- [ ] Se ejecuta al arrancar, sin diálogo: los reparados se añaden al historial (17) con su nombre final y un `notice` discreto tipo "Recovered 1 unfinished recording"
- [ ] Si la reparación falla, conservar el `.part` intacto y registrarlo en el log (nunca se borra nada automáticamente)

### Paso 3 — Tests
- [ ] `recovery.test.ts`: codificar 5 s de seno, matar ffmpeg a mitad (`SIGKILL`), recuperar, y `ffmpeg -i` lee una duración > 0 en MP3 y en WAV
- [ ] `.part` vacío o ilegible → se conserva y no lanza excepción

### Paso 4 — Verificación
- [ ] Grabar 20 s, matar el proceso de Electron desde el Administrador de tareas, arrancar: el archivo aparece ya recuperado y se reproduce
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [ ] Commit: `feat(files): recuperación automática de grabaciones .part`
- [ ] **Cierre de Fase 4**

## Criterios de aceptación
- [ ] Cerrar la app a la fuerza deja un archivo recuperado al siguiente arranque, sin intervención (criterio de §16)
- [ ] El archivo recuperado se reproduce en MP3 y en WAV
- [ ] Un `.part` que no se puede reparar se conserva y queda anotado en el log

## Bitácora
- _(fecha — nota)_
