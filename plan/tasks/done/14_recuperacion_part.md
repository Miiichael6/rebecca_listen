# 14 · Recuperación de archivos `.part`

**Estado:** ✅ Terminada
**Fase:** 4 — Grabación · **Depende de:** 13 · **Doc:** [§3.3, §16](../../PROMPT_rebecca_listen.md)

## Objetivo
Si la app se cierra a la fuerza durante una grabación, al volver a arrancar repara sola los `.part` huérfanos y los deja como archivos reproducibles, sin preguntar nada al usuario.

## Pasos

### Paso 1 — Registro de grabaciones abiertas
- [x] Al abrir un encoder, guardar en `userData/open-recordings.json` la ruta del `.part`, formato, tasa y canales; quitarla al cerrar bien
- [x] Al arrancar, combinar esa lista con un escaneo de `*.part` en la carpeta de destino activa

### Paso 2 — Reparación automática
- [x] `src/main/files/recovery.ts`: por formato
  - MP3: remux con ffmpeg (`-c copy`, `-err_detect ignore_err`) a un archivo final
  - WAV: reescribir la cabecera RIFF con el tamaño real (o remux con ffmpeg)
- [x] Se ejecuta al arrancar, sin diálogo: los reparados se añaden al historial (17) con su nombre final y un `notice` discreto tipo "Recovered 1 unfinished recording"
- [x] Si la reparación falla, conservar el `.part` intacto y registrarlo en el log (nunca se borra nada automáticamente)

### Paso 3 — Tests
- [x] `recovery.test.ts`: codificar 5 s de seno, matar ffmpeg a mitad (`SIGKILL`), recuperar, y `ffmpeg -i` lee una duración > 0 en MP3 y en WAV
- [x] `.part` vacío o ilegible → se conserva y no lanza excepción

### Paso 4 — Verificación
- [x] Grabar 20 s, matar el proceso de Electron desde el Administrador de tareas, arrancar: el archivo aparece ya recuperado y se reproduce
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan; `npm run dev` arranca
- [x] Commit: `feat(files): recuperación automática de grabaciones .part`
- [x] **Cierre de Fase 4**

## Criterios de aceptación
- [x] Cerrar la app a la fuerza deja un archivo recuperado al siguiente arranque, sin intervención (criterio de §16)
- [x] El archivo recuperado se reproduce en MP3 y en WAV
- [x] Un `.part` que no se puede reparar se conserva y queda anotado en el log

## Bitácora
- 2026-09-29 — El registro guarda ruta final, fecha y source (para el historial), no tasa ni canales: el formato sale de la extensión y el remux con `-c copy` no los necesita. WAV también por remux (`-ignore_length 1`), no reescribiendo la cabecera a mano.
- 2026-09-29 — La reparación escribe a `.repairing` y solo renombra si `ffmpeg -i` lee una duración; la lista se toma antes de registrar el IPC y se repara tras `did-finish-load`, para que el aviso llegue a la ventana.
- 2026-09-29 — Verificado matando el árbol de Electron con `taskkill /F /T` (ffmpeg incluido): MP3 de 33 s y WAV de 20 s recuperados, en la lista y reproducibles; un `.part` corrupto se conservó y quedó en el log.
