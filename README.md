# Rebecca Listen

Grabadora de audio para Windows (Electron + React + TypeScript): graba el sonido del equipo, el micrófono o los dos a la vez, en MP3 o WAV. La captura la hace un sidecar en Rust (`rl-capture.exe`, WASAPI) y la codificación, ffmpeg.

## Requisitos

- **Windows 10/11** (la captura usa WASAPI: no hay versión para macOS ni Linux).
- **Node.js** con npm.
- **Rust** (`stable-x86_64-pc-windows-msvc`) y **Visual Studio Build Tools** con el workload *Desktop development with C++* (VCTools), para compilar el sidecar.

ffmpeg no hay que instalarlo: viene con `ffmpeg-static` al hacer `npm install`.

## Lanzar en desarrollo

```bash
# 1. Dependencias
npm install

# 2. Compilar el sidecar de captura y copiarlo a resources/bin/
#    (no está en git; repetir solo si cambia algo en native/)
npm run build:native

# 3. Arrancar la app con recarga en caliente
npm run dev
```

Si `npm run dev` falla con `electron.app` undefined o un error en `@electron-toolkit/utils`, es que la variable `ELECTRON_RUN_AS_NODE` está definida en la terminal (algunos entornos, como la terminal integrada de VS Code, la exportan) y Electron arranca como Node puro. Quítala antes de lanzar:

```bash
# Git Bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

```powershell
# PowerShell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npm run dev
```

Para ver la versión compilada sin recarga en caliente: `npm start`.

## Comprobaciones

```bash
npm test            # vitest (incluye pruebas con el ffmpeg real)
npm run typecheck   # main y renderer
npm run lint
```

## Instalador

```bash
npm run build:win      # sidecar + typecheck + build + instalador NSIS en dist/
```

## Publicar una versión

Las versiones se publican en [GitHub Releases](https://github.com/Miiichael6/rebecca_listen/releases) y la app instalada se actualiza sola con un clic (`electron-updater`).

### Antes de empezar

- `gh auth status` debe mostrar la sesión iniciada con permiso `repo`. Si no, `gh auth login`.
- El árbol de trabajo debe estar limpio: todo lo que va en la versión, ya en un commit.
- El sidecar debe estar compilado (`npm run build:native`): `resources/bin/rl-capture.exe` no está en git y sin él el instalador saldría sin captura.

### Pasos (PowerShell, todos en la misma terminal)

```powershell
# 1. Subir la versión: edita package.json, hace commit y crea el tag vX.Y.Z
npm version patch        # arreglos: 1.0.0 → 1.0.1
# npm version minor      # funciones nuevas: 1.0.0 → 1.1.0

# 2. Subir commit y tag
git push; git push --tags

# 3. Crear el borrador del Release ANTES de compilar (evita borradores duplicados, ver abajo)
$v = (node -p "require('./package.json').version")
gh release create "v$v" --draft --title $v --notes "Novedades de la $v"

# 4. Compilar y subir el .exe, el .blockmap y latest.yml a ese borrador
$env:GH_TOKEN = (gh auth token)
npm run release
```

En Git Bash, los pasos 3 y 4 son:

```bash
v=$(node -p "require('./package.json').version")
gh release create "v$v" --draft --title "$v" --notes "Novedades de la $v"
export GH_TOKEN=$(gh auth token)
npm run release
```

`gh auth token` saca el token de la sesión de `gh`, así que no hay que pegar ninguno. El token nunca se guarda en archivos del repo.

5. **Revisar y publicar.** En [Releases](https://github.com/Miiichael6/rebecca_listen/releases), abre el borrador `vX.Y.Z`. Debe tener **un solo** borrador con estos tres archivos:
   - `rebecca_listen-X.Y.Z-setup.exe`
   - `rebecca_listen-X.Y.Z-setup.exe.blockmap`
   - `latest.yml`

   Escribe las notas y pulsa **Publish release**.

6. **Comprobar** que GitHub la da como la última:

   ```powershell
   gh api repos/Miiichael6/rebecca_listen/releases/latest --jq .tag_name
   ```

Las apps instaladas la detectan al arrancar. Cuando hay una versión nueva aparece el botón de la barra de título: se pulsa **Actualizar** y después **Reiniciar**.

### Problemas conocidos

- **`GitHub Personal Access Token is not set`**: falta `$env:GH_TOKEN = (gh auth token)` en esa terminal. La variable se pierde al cerrarla. El instalador ya quedó en `dist/`; basta con repetir el paso 4.
- **Dos borradores con el mismo tag**: si el borrador no existe antes de `npm run release`, `electron-builder` puede crear dos y repartir los archivos entre ellos. Para arreglarlo:
  1. Borra el que solo tiene el `.blockmap`.
  2. En el otro, **Edit** → arrastra `dist/rebecca_listen-X.Y.Z-setup.exe.blockmap` desde el Explorador de Windows.
  3. Comprueba que el adjunto termine en `.blockmap`: si termina en `.url` es un acceso directo, bórralo y súbelo de nuevo.
- **No repitas `npm run release` con la misma versión**: vuelve a subir los archivos y puede duplicar borradores. Si hay que recompilar, sube la versión (`npm version patch`).
- **Sin `.blockmap`** la actualización funciona igual, pero descarga el instalador completo en vez de solo lo que cambió.
- **Si `latest.yml` no corresponde a ese `.exe`**, la app descarta la descarga. Nunca mezcles archivos de dos compilaciones distintas en un Release.
- **`dist/` con instaladores viejos**: `electron-builder` no lo vacía; bórralo a mano antes de `npm run release` para no subir restos de otra versión.

Un tag ya publicado no se mueve: si una versión sale con un fallo, se publica `X.Y.Z+1`.

La `v1.0.0` es la primera versión; las siguientes se actualizan solas desde ella.