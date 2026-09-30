# 47 · El botón de actualizar solo aparece con una versión nueva

**Estado:** ✅ Terminada
**Fase:** 12 — Empaquetado · **Depende de:** 44 · **Doc:** petición del usuario

## Objetivo
El botón de la barra de título no se muestra si no hay nada que actualizar; aparece solo cuando la comprobación encuentra una versión más nueva.

## Pasos
- [x] `updateAction` devuelve `null` en `idle`, `checking`, `upToDate` y `error`; solo `available`, `downloading` y `ready` tienen botón
- [x] `UpdateButton` no pinta nada con `null`; fuera el paso `check` y el estilo `.error`
- [x] Test de `updateAction` actualizado
- [x] Commit: `feat(updates): botón de actualizar solo con versión nueva`

## Criterios de aceptación
- [x] Sin versión nueva (o sin red) la barra de título no muestra el botón
- [x] Con versión nueva sale "Update to X" → "Downloading %" → "Restart to update"

## Bitácora
- 2026-09-30 — La búsqueda queda solo en la comprobación silenciosa a los 10 s de abrir. Si la descarga falla, el botón desaparece hasta el próximo arranque (el estado `error` no guarda la versión).
