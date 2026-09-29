# 12 · Nombres automáticos y carpeta de destino

**Estado:** ⬜ Pendiente
**Fase:** 4 — Grabación · **Depende de:** 03 · **Doc:** [§9.1](../../PROMPT_rebecca_listen.md) · **Ref:** `images/05_options_files_autoname.png`

## Objetivo
Cada grabación se guarda sola, sin preguntar nada, en `Escritorio\Rebecca Listen Recordings` con el nombre `[YYYY-MM-DD][hh-mm-ss].<ext>` y sin sobrescribir nunca un archivo existente. Las plantillas alternativas, el prefijo y el "Guardar como" llegan con la tarea 22 (en `despues/`).

## Pasos

### Paso 1 — Generador (lógica pura, `src/shared/naming.ts`)
- [ ] `buildFileName(now, format)` → `[YYYY-MM-DD][hh-mm-ss].mp3` (plantilla por defecto de `defaults.ts`)
- [ ] Dejar la firma preparada para recibir plantilla y prefijo cuando llegue la 22, sin implementar esas ramas

### Paso 2 — Resolución en main (`src/main/files/naming.ts`)
- [ ] `resolveOutputPath(settings, now)`: carpeta de destino de los settings (por defecto `app.getPath('desktop')` + `Rebecca Listen Recordings`), creada si no existe
- [ ] Colisión → sufijo ` (1)`, ` (2)`… comprobando también el `.part` correspondiente
- [ ] Si la carpeta no se puede crear o no hay permiso de escritura: error claro al renderer (`notice`) y no se graba

### Paso 3 — Tests
- [ ] `naming.test.ts`: nombre con una fecha fija para mp3 y wav, cambio de hora con ceros a la izquierda, colisiones (1)(2) con un `fs` simulado, colisión contra un `.part`

### Paso 4 — Verificación
- [ ] Llamar `resolveOutputPath` desde un handler de dev: crea la carpeta del escritorio y devuelve el nombre esperado
- [ ] Dejar un archivo con el nombre que tocaría: devuelve el mismo con ` (1)`
- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan
- [ ] Commit: `feat(files): nombres automáticos y carpeta de destino`

## Criterios de aceptación
- [ ] La grabación se guarda sin intervención del usuario en una carpeta que la app crea si hace falta
- [ ] Nunca se sobrescribe un archivo existente
- [ ] Un fallo de permisos se avisa en la UI en vez de perder la grabación

## Bitácora
- _(fecha — nota)_
