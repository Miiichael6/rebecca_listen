# 22 · Pestaña Files (Auto Name y formatos)

**Estado:** ✅ Terminada
**Fase:** 7 — Options · **Depende de:** 12, 20 · **Doc:** [§9](../../../PROMPT_rebecca_listen.md) · **Ref:** `images/05_options_files_autoname.png`, `06_options_files_mp3.png`

## Objetivo
La pestaña Files tiene su panel lateral (Auto Name · MP3 · WAV) y edita la carpeta, prefijo, plantilla, formato y parámetros de cada códec, con vista previa en vivo del nombre final.

## Pasos

### Paso 1 — Panel lateral
- [x] Barra izquierda azul claro con las 3 secciones; la activa resaltada en blanco

### Paso 2 — Auto Name
- [x] ☑ Enable
- [x] Carpeta de destino: input de solo lectura + botón "…" → IPC `files:chooseFolder` (ya existe, tarea 38)
- [x] Prefijo con placeholder "(Optional)" y `validatePrefix()` nuevo (caracteres `<>:"/\|?*` y nombres reservados de Windows) con error en rojo
- [x] Desplegable de plantillas (`YYYY-MM-DD_hh-mm-ss`, `YYYYMMDD_hhmmss`, `[hh-mm-ss]`, `Recording_###`, `Custom…`) ampliando `buildFileName()` de 12; con Custom… un input de tokens `{YYYY} {MM} {DD} {hh} {mm} {ss} {n}` con ayuda
- [x] Desplegable de formato .mp3 / .wav
- [x] "For example": vista previa gris con el nombre generado + `truncateMiddle()`, actualizada en vivo

### Paso 3 — Secciones de códec
- [x] MP3: Sample rate (8000…48000), Channels Mono/Stereo, Mode CBR/VBR, Bitrate 32–320 kbps (CBR) o Quality V0–V9 (VBR)
- [x] WAV: Sample rate, Channels, Bit depth 16 / 24 / 32 float
- [x] El encoder de 11 lee estos valores al abrir cada archivo

### Paso 4 — Verificación
- [x] Comparar con las capturas 05 y 06; la vista previa cambia al tocar prefijo, plantilla o formato
- [x] Grabar un archivo en cada formato con valores no por defecto y comprobar con `ffmpeg -i` que se aplicaron
- [x] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [x] Commit: `feat(options): pestaña files con auto name y formatos`

## Criterios de aceptación
- [x] Carpeta, prefijo, plantilla, formato y parámetros de MP3 y WAV son editables y persisten
- [x] La vista previa coincide con el nombre real generado al grabar
- [x] Los archivos grabados respetan la configuración del códec

## Bitácora
- 2026-09-30 — Enable desmarcado = "Save as" antes de grabar (ruta de un solo uso fuera de la máquina de estados); la carpeta del "…" queda en el borrador (`files:pickFolder`) y se guarda con Apply.
- 2026-09-30 — La vista previa la calcula main (`files:previewPath` → `plannedPath`) para que coincida con el nombre real, contador y colisiones incluidos; plantilla `[YYYY-MM-DD][hh-mm-ss]` se mantiene por defecto y `{source}` queda fuera.
- 2026-09-30 — Verificado por CDP: errores de prefijo bloquean OK/Apply; MP3 22050 mono VBR V5 y WAV 32000 mono 32 float confirmados con ffmpeg. Save as no probado (diálogo nativo). El test de rendimiento del resampler sigue intermitente en la suite completa.
