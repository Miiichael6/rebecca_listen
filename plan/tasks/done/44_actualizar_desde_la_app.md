# 44 · Buscar y aplicar actualizaciones desde la app

**Estado:** ✅ Terminada (falta la prueba con un release real)
**Fase:** 12 — Empaquetado · **Depende de:** 35 · **Doc:** petición del usuario (no volver a descargar el .exe)

## Objetivo
Un botón en la barra de título busca versiones nuevas, las descarga y reinicia la app ya actualizada, sin bajar un instalador a mano.

## Pasos
- [x] Contrato IPC: `updates:status`, `updates:check`, `updates:download`, `updates:install` y el evento `updates:changed`; tipo `UpdateStatus`
- [x] Main (`src/main/updates/`): `updater.ts` sobre `electron-updater` (sin descarga automática, instala al cerrar si quedó descargada, no reinicia mientras se graba), `errorMessage.ts` con test
- [x] Comprobación silenciosa 10 s después de abrir la ventana (solo app empaquetada o con `dev-app-update.yml`)
- [x] UI: `UpdateButton` en la barra de título (Check → Update to X → Downloading % → Restart to update), `updateAction.ts` con test y `store/updates.ts`
- [x] `publish` de electron-builder y `dev-app-update.yml` a GitHub Releases (`Miiichael6/rebecca_listen`, borrador)
- [x] Verificado en la app real: el botón sale y la comprobación automática corre (404 hasta que exista el release)
- [ ] En vivo (usuario): publicar el repo y un release con `npm run build:win -- --publish always`; instalar la versión anterior y actualizar con el botón
- [x] Commit: `feat(updates): botón para buscar e instalar actualizaciones`

## Criterios de aceptación
- [ ] Con un release más nuevo, el botón lo ofrece, descarga con porcentaje y reinicia en la versión nueva
- [x] Sin red o sin release, el botón muestra el error y deja reintentar
- [x] No se reinicia para instalar mientras se graba

## Bitácora
- 2026-09-30 — Sigue el patrón de rebeca_writes, recortado: sin ajuste "auto check", sin notas del release, sin control de espacio en disco (el error `ENOSPC` sí se traduce). Resuelve D2 a favor de GitHub Releases; el repo `rebecca_listen` se crea al lanzar el primer release.
- Para publicar hace falta `GH_TOKEN` en el entorno y subir la versión en `package.json` antes de cada release. D3 (firma) sigue abierta: sin firmar, SmartScreen avisa al instalar la primera vez.
