# PROMPT MAESTRO · Rebecca Listen (clon de NowSmart Audio Recorder)

> Pega este documento completo en Claude Code desde la raíz del proyecto `rebecca_listen`.
> Las capturas de referencia están en `plan/tasks/images/`. Ábrelas y úsalas como fuente visual de verdad antes de implementar cada pantalla.

---

## Alcance vigente (leer antes que todo lo demás)

**Este documento describe el clon completo; el alcance real lo manda [tasks/00_README.md](tasks/00_README.md).** Se conserva entero porque sigue siendo la fuente visual y de comportamiento de lo que sí se construye, y porque las tareas enlazan a sus secciones por número.

| Sección | Estado |
|---|---|
| §0–§4 (salvo §4.7), §13, §14, §16, §17 | ✅ **Vigente** — es el núcleo (tareas 01–17, 35, 36) |
| §5, §9, §10.1–§10.2, §12.2 | 🕒 **Aplazado** — se hará después del núcleo (tareas 20, 22, 23, 27, 30, 31). De §9 solo MP3 y WAV |
| §6 Effects (AGC, Noise Suppression), §7 VAS, §8 FLL, §10.3 About, §11 Perfiles, §12.1 Schedule, §12.3 Convert, §12.4 Trim | ⛔ **Eliminado del proyecto** (2026-09-28) — referencia, no trabajo pendiente |
| §15 Plan por fases | ⛔ **Obsoleto** — sustituido por el tablero de `tasks/` |

Diferencias del núcleo respecto a lo que dice este documento: solo MP3 y WAV (no OGG ni FLAC) · solo se listan dispositivos conectados, detectados por sondeo cada 2 s en vez de COM · no hay reproductor propio (se abre el de Windows) · una sola configuración, sin perfiles · textos en inglés sin capa de i18n · la máquina de estados solo tiene `idle`, `recording` y `paused`.

---

## 0. Contexto y objetivo

Vas a construir **Rebecca Listen**, una app de escritorio para Windows que graba audio del sistema, del micrófono o de ambos a la vez, con nombres automáticos e historial. Es un clon funcional de *NowSmart Audio Recorder 1.2026.60618*, sin licencias ni límites (todas las funciones "Pro" vienen habilitadas) — pero **recortado**: ver "Alcance vigente" arriba.

El proyecto ya existe y usa **electron-vite + React 19 + TypeScript + electron-builder**. Respeta esa base, no la reinicies.

Referencias visuales

| Archivo | Qué muestra |
|---|---|
| `01_source_dropdown_devices.png` | Desplegable Source con modos y lista completa de dispositivos |
| `02_options_effects.png` | Pestaña Effects |
| `03_options_vas.png` | Pestaña VAS (Voice Activation System) |
| `04_options_fll.png` | Pestaña FLL (File Length Limit) |
| `05_options_files_autoname.png` | Files › Auto Name |
| `06_options_files_mp3.png` | Files › MP3 |
| `07_options_hotkeys.png` | Pestaña Hotkeys |
| `08_options_system.png` | Pestaña System |
| `09_options_about.png` | Pestaña About |
| `10_profiles_manager.png` | Gestor de perfiles |
| `11_plans_basic_vs_pro.png` | Tabla de funciones (referencia de alcance) |
| `12_main_window_recording.png` | Ventana principal grabando |

---

## 1. Reglas generales para Claude Code

1. Trabaja por fases (sección 12). Al terminar cada fase ejecuta `npm run typecheck` y `npm run lint` y corrige todo antes de seguir.
2. Todo el procesamiento de audio y el acceso a disco vive en el **proceso main** (o en procesos hijos / workers). El renderer solo dibuja UI y habla por IPC tipado.
3. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` en el renderer. Expón una API mínima en `preload` con `contextBridge`.
4. Define todos los canales IPC en un único archivo compartido `src/shared/ipc.ts` con tipos de request y response.
5. Nada de valores mágicos. Los valores por defecto viven en `src/shared/defaults.ts`.
6. Código y nombres en inglés. Textos de UI en inglés igual que el original, preparados para i18n (`src/renderer/src/i18n/en.json`, `es.json`).
7. Cada módulo de audio debe tener tests unitarios con Vitest usando buffers PCM sintéticos (seno, silencio, ruido).
8. Registra todo evento relevante con `electron-log` (inicio/fin de grabación, errores de dispositivo, cortes FLL, eventos VAS).

---

## 2. Arquitectura

```
src/
  shared/            tipos, ipc.ts, defaults.ts, schema de settings
  main/
    index.ts         ventana, tray, ciclo de vida
    ipc/             handlers por dominio
    audio/
      engine/        AudioEngine (interfaz) + implementación nativa
      devices.ts     enumeración y hot-plug de dispositivos
      mixer.ts       mezcla sistema + micrófono
      dsp/           gain.ts, agc.ts, noiseSuppression.ts, meter.ts, resampler.ts
      vas.ts         detector de silencio y máquina de estados
      fll.ts         control de límite por tiempo / tamaño
      encoder/       Encoder (interfaz) + ffmpeg (mp3, ogg, wav, flac)
      session.ts     orquestador de una grabación
    files/naming.ts  generador de nombres
    history.ts       historial persistente
    settings.ts      settings + perfiles
    hotkeys.ts       globalShortcut
    scheduler.ts     grabaciones programadas
    tray.ts
  preload/index.ts
  renderer/src/
    windows/Main/    ventana principal
    windows/Options/ diálogo de opciones con pestañas
    components/      Waveform, VuMeter, SourcePicker, TransportBar, RecordingList, etc.
    store/           estado (Zustand)
native/              sidecar de captura (ver 3.2)
```

### 2.1 Flujo de datos de una grabación

```
Captura (sistema / mic)  ->  PCM Float32
   -> resampler a la tasa de salida
   -> mixer (si modo "Computer Sounds & Voice")
   -> gain (slider Level)
   -> AGC (opcional)
   -> Noise Suppression (opcional)
   -> meter (RMS / peak por canal, 30 fps al renderer)
   -> waveform (picos decimados, 30 fps al renderer)
   -> VAS (decide grabar / pausar / cortar / parar)
   -> FLL (decide cortar / parar)
   -> encoder ffmpeg (stdin PCM, stdout archivo)
```

---

## 3. Motor de audio

### 3.1 Interfaz `AudioEngine`

```ts
interface AudioDevice {
  id: string              // id estable del endpoint
  name: string            // "Altavoces", "CABLE Output", "Micrófono"
  groupName: string       // nombre del hardware, "Realtek(R) Audio"
  kind: 'render' | 'capture'
  state: 'active' | 'unplugged' | 'disabled'
  isDefault: boolean
  channels: number
  sampleRate: number
}

interface AudioEngine {
  listDevices(): Promise<AudioDevice[]>
  onDevicesChanged(cb: (d: AudioDevice[]) => void): () => void
  openStream(opts: { deviceId: string; loopback: boolean }): AudioStream
}

interface AudioStream {
  sampleRate: number
  channels: number
  onData(cb: (frames: Float32Array) => void): void   // intercalado
  onError(cb: (e: Error) => void): void
  start(): void
  stop(): void
}
```

### 3.2 Implementación en Windows

- Chromium no permite loopback por dispositivo específico, así que la captura se hace con un **sidecar nativo en Rust** usando `cpal` (backend WASAPI).
  - Dispositivo *render* abierto como input = **loopback** (captura lo que suena por esa salida).
  - Dispositivo *capture* = micrófono / línea de entrada normal.
- El sidecar se comunica con main por stdin/stdout con un protocolo binario simple
  - Comandos JSON por línea en stdin (`list`, `open`, `start`, `stop`).
  - Frames PCM f32le por stdout con cabecera `[streamId u8][frameCount u32]`.
  - Eventos (hot-plug, errores) por stderr en JSON por línea.
- Para enumerar también dispositivos desconectados ("Not plugged in") usa `IMMDeviceEnumerator::EnumAudioEndpoints` con `DEVICE_STATEMASK_ALL` (vía crate `windows`) y combina con `cpal`.
- Suscríbete a `IMMNotificationClient` para detectar conexión y desconexión y reemitir la lista.
- Empaqueta el binario en `resources/bin/` y declara `extraResources` en `electron-builder.yml`.
- Deja preparada la interfaz para un futuro motor macOS / Linux, pero implementa solo Windows por ahora.

### 3.3 Encoding

- Usa `ffmpeg-static` como proceso hijo. Entrada `-f f32le -ar <rate> -ac <ch> -i pipe:0`.
- Salidas
  - MP3 `libmp3lame`, CBR `-b:a` o VBR `-q:a`.
  - OGG `libvorbis` con `-q:a`.
  - WAV `pcm_s16le` / `pcm_s24le` / `pcm_f32le`.
  - FLAC con `-compression_level`.
- Escribe a un archivo temporal `*.part` y renómbralo al cerrar correctamente. Si la app se cae, al arrancar ofrece recuperar los `.part` huérfanos.
- La duración y el tamaño del archivo se calculan en tiempo real (bytes escritos por ffmpeg vía `fs.stat` cada 500 ms, y frames procesados / sampleRate).

---

## 4. Ventana principal (ver `12_main_window_recording.png`)

Ventana de ~445 × 620 px, redimensionable con mínimo 420 × 560. Barra de título nativa con icono, título "Rebecca Listen", minimizar, maximizar y cerrar.

### 4.1 Fila Source

- Etiqueta gris "Source" a la izquierda, combo a la derecha ocupando el ancho.
- **Deshabilitado (gris) mientras se graba.**
- Contenido del desplegable (ver `01_source_dropdown_devices.png`)
  1. Tres modos rápidos, con check verde en el seleccionado
     - **Computer Sounds** · loopback del dispositivo de salida por defecto.
     - **Voice** · micrófono por defecto.
     - **Computer Sounds & Voice** · ambos mezclados. A la derecha un botón **"?"** que muestra un tooltip explicando que se mezcla la salida por defecto con el micrófono por defecto.
  2. Barra de color teal con **"•••"** que expande / colapsa la lista avanzada.
  3. Lista avanzada agrupada por hardware. Cada grupo tiene una cabecera gris con el nombre del hardware (ej. "Realtek(R) Audio", "VB-Audio Virtual Cable", "WH-1000XM4") y debajo sus endpoints
     - **Verde** = dispositivo de salida (se graba en loopback).
     - **Rojo** = dispositivo de entrada (micrófono, línea de entrada, CABLE Output).
     - Texto gris **"Not plugged in"** alineado a la derecha si el endpoint está desconectado. Esos ítems se ven pero no se pueden seleccionar.
- La lista se actualiza en vivo cuando se conecta o desconecta un dispositivo. Si el dispositivo seleccionado desaparece durante la grabación, se detiene la grabación de forma segura, se guarda el archivo y se muestra un aviso.
- La elección se guarda en settings.

### 4.2 Fila Level

- Etiqueta "Level" y slider horizontal azul (0 a 200 %, 100 % por defecto, en el centro). Aplica ganancia en tiempo real al audio grabado.
- Doble clic sobre el slider lo resetea a 100 %.
- Debajo, **VU meter estéreo** con dos filas (L y R) de ~40 segmentos cada una
  - Verde hasta −12 dBFS, amarillo hasta −3 dBFS, rojo encima.
  - Indicador de pico con caída lenta (peak hold 1 s).
  - Funciona también en estado "Ready" (monitoreo sin grabar) para que el usuario vea si hay señal.

### 4.3 Waveform en vivo

- Franja de ancho completo con fondo blanco y rejilla de líneas grises tenues.
- Forma de onda azul rellena, espejada sobre una línea central, que se desplaza de derecha a izquierda (scroll continuo).
- Dibujada en `<canvas>` con `requestAnimationFrame`, recibiendo picos decimados desde main a 30 fps.
- En pausa la forma de onda se congela.

### 4.4 Cronómetro

- Texto grande centrado `MM:SS` (pasa a `H:MM:SS` al superar una hora), fuente monoespaciada.
- Cuenta solo el tiempo grabado real (no avanza en pausa ni durante silencios pausados por VAS).
- En pausa parpadea suavemente.

### 4.5 Barra de estado de la lista

Barra gris oscura con, de izquierda a derecha
- **Badge de estado** · "Ready" (gris), "Recording" (rojo), "Paused" (ámbar), "Waiting" (azul, VAS esperando sonido), "Scheduled" (morado).
- **Badge contador** redondo con el total de grabaciones en la lista.
- Columnas indicadoras **AGC · NS · VAS · FLL · Schedule**. Cada una se ilumina (blanco / color) cuando esa función está activa y queda apagada (gris) cuando no. Al pasar el ratón muestra un tooltip con su configuración actual (ej. "FLL · 1000 KB · new file"). Clic en el indicador abre la pestaña correspondiente de Options.

### 4.6 Lista de grabaciones

- Filas cebra (blanco / gris muy claro).
- Cada fila muestra el **nombre del archivo** a la izquierda y la **duración** a la derecha (`00:05`). La grabación en curso muestra `--:--` y su texto va en azul.
- La fila seleccionada tiene una **barra vertical azul a la izquierda** y texto azul.
- Doble clic reproduce. Clic derecho abre un menú contextual
  - Play
  - Open file location
  - Rename
  - Trim… (ver 10.2)
  - Convert to… (MP3, OGG, WAV, FLAC)
  - Remove from list
  - Delete file (con confirmación)
  - Properties (ruta, formato, tamaño, sample rate, bitrate, fecha)
- Si el archivo ya no existe en disco la fila se muestra tachada en gris con un icono de aviso (el original no lo hace, es una mejora).
- Soporta arrastrar una fila fuera de la app para soltar el archivo en el Explorador o en otra app (`webContents.startDrag`).
- Tecla `Supr` elimina de la lista, `Enter` reproduce, `F2` renombra.

### 4.7 Barra de progreso de reproducción

> ⛔ **Eliminado del proyecto.** No hay reproductor propio: doble clic en la lista abre el archivo en el reproductor de Windows (tarea 17). El menú contextual de §4.6 (Properties, Convert, Trim, arrastrar fuera) también queda eliminado; la lista solo tiene `Supr`, `F2` y doble clic.

Slider fino negro de ancho completo debajo de la lista. Muestra y permite mover la posición del archivo que se está reproduciendo. Se desactiva mientras se graba.

### 4.8 Barra de transporte

- **Botón grande redondo de grabar** con punto rojo. En grabación el punto se convierte en cuadrado o pulsa.
- Grupo de botones en píldora
  - **⏏ File** · abre la carpeta de destino (clic) o un menú con "Open folder" / "Open audio file…" para cargar un archivo externo en la lista y reproducirlo.
  - **■ Stop** · detiene la grabación o la reproducción.
  - **▶ Play** · reproduce el elemento seleccionado.
  - **⏸ Pause** · pausa / reanuda la grabación o la reproducción.
- A la derecha, en lugar del botón "Upgrade" del original, pon un botón discreto **"Split"** (equivale al hotkey *Cut*, cierra el archivo actual y continúa grabando en uno nuevo sin perder audio).
- Botón engranaje ⚙ que abre el diálogo **Options**.
- Todos los botones con tooltip que indique su hotkey si tiene uno asignado.

### 4.9 Máquina de estados de la sesión

```
idle(Ready) --record--> recording
recording --pause--> paused --pause--> recording
recording --VAS silencio (modo pausa)--> waiting --sonido--> recording
recording --VAS silencio (modo nuevo archivo)--> waiting --sonido--> recording (archivo nuevo)
recording --VAS silencio (modo stop)--> idle
recording --FLL límite (nuevo archivo)--> recording (archivo nuevo)
recording --FLL límite (stop)--> idle
recording --split--> recording (archivo nuevo)
cualquiera --stop--> idle
idle --schedule--> scheduled --hora--> recording
```

Implementa esta máquina con un reducer tipado (o XState) en main y emite cada cambio al renderer.

---

## 5. Diálogo Options (común a todas las pestañas)

> 🕒 **Aplazado** (tarea 20). Solo tres pestañas: Files, Hotkeys y System. Sin desplegable de perfiles en el pie.

- Ventana modal hija de la principal, ~440 × 560 px, no redimensionable, con título "Options" y botón cerrar rojo.
- Pestañas con color propio como en las capturas
  - Effects (naranja claro) · VAS (lavanda) · FLL (amarillo) · Files (azul claro) · Hotkeys (rosa) · System (verde claro) · About (gris).
- Cada pestaña tiene un encabezado en negrita con separador inferior.
- **Pie del diálogo**
  - Izquierda, desplegable **"Default ▾"** con los perfiles existentes, un separador y la opción **"Manage profiles…"** que abre el Profiles Manager (sección 9).
  - Derecha, **OK** (aplica y cierra), **Cancel** (descarta y cierra), **Apply** (aplica sin cerrar). Apply se deshabilita si no hay cambios.
- Los cambios se editan sobre una copia en borrador y solo se persisten con Apply / OK.
- Si se cambia algo que afecta a una grabación en curso (formato, carpeta), se aplica desde el siguiente archivo y se avisa con un texto pequeño.

---

## 6. Pestaña Effects (ver `02_options_effects.png`)

> ⛔ **Eliminado del proyecto.** El slider de Level cubre la necesidad; AGC y RNNoise no se implementan. Se deja como referencia.

- **☐ Auto Gain Control** con subtítulo gris "Adjust recording volume automatically".
  - Implementación: AGC con objetivo −18 dBFS RMS, ventana de 300 ms, ataque 10 ms, liberación 500 ms, ganancia máxima +24 dB, limitador suave a −1 dBFS para evitar clipping.
- **☐ Noise suppression mode** + desplegable **Low / Moderate / High / Very High**.
  - Implementación: RNNoise (via `@jitsi/rnnoise-wasm` en un worker, o el filtro `arnndn` de ffmpeg). El nivel controla la mezcla entre señal original y señal limpia (Low 40 %, Moderate 65 %, High 85 %, Very High 100 %) y un gate adicional en Very High.
  - El desplegable se deshabilita si el checkbox está desmarcado.
- Pie con badge azul **"Info"** y texto "These effects are only recommended for voice recording."
- Ambos efectos se pueden activar o desactivar durante una grabación y se reflejan al instante en los indicadores AGC / NS.

---

## 7. Pestaña VAS · Voice Activation System (ver `03_options_vas.png`)

> ⛔ **Eliminado del proyecto.** Referencia, no trabajo pendiente.

- **Silence detection threshold** con slider de −60 dB a 0 dB (por defecto −26 dB). La pista del slider es un degradado verde → amarillo → rojo y a la derecha se muestra el valor `[-26 dB]`. Texto de ayuda "It identifies any input level below this threshold as silence."
  - Mejora sugerida: dibujar sobre el slider el nivel actual de entrada en vivo para calibrar el umbral.
- Tres opciones con campo numérico (spin box, mínimo 1, máximo 3600, paso 1)
  1. **☐ Pause recording after [1] seconds of silence.** Ayuda "resume recording when sound is detected again."
  2. **☐ Pause recording after [2] seconds of silence.** Ayuda "begin a new recording when sound is detected again."
  3. **☐ Stop recording after [10] seconds of silence.**
- Las opciones 1 y 2 son mutuamente excluyentes (marcar una desmarca la otra). La 3 se puede combinar con 1 o 2, y su contador corre en paralelo.
- Lógica
  - Nivel = RMS en ventanas de 50 ms convertido a dBFS, con histéresis de 3 dB para evitar parpadeos.
  - Al volver el sonido, incluye un **pre-roll de 300 ms** (buffer circular) para no cortar la primera sílaba.
  - Al entrar en silencio, conserva un **hang time de 200 ms** antes de pausar.
  - Opción 1 no escribe el silencio en el archivo (lo recorta). Opción 2 cierra el archivo y abre uno nuevo al volver el sonido. Opción 3 detiene la sesión.
- Estado visible "Waiting" en la barra de la lista mientras VAS espera sonido.

---

## 8. Pestaña FLL · File Length Limit (ver `04_options_fll.png`)

> ⛔ **Eliminado del proyecto.** Referencia, no trabajo pendiente.

- **Limitation type** con radios
  - ◯ **Time** [180] seconds (1 a 86 400).
  - ◉ **Size** [1000] kb (100 a 4 000 000).
  - El campo del radio no seleccionado queda deshabilitado.
- **FLL mode** con checkboxes mutuamente excluyentes
  - ☐ **Record a new file when the limit is reached.**
  - ☐ **Stop recording when the limit is reached.**
- FLL está activo solo si hay un modo marcado. Entonces el indicador FLL se ilumina.
- El corte debe ser **sin pérdida de muestras**. El buffer que cruza el límite se divide y el resto va al archivo nuevo.
- Para Size, estima el tamaño con el bitrate configurado y verifícalo con el tamaño real que escribe ffmpeg. Corta cuando se alcance el menor de los dos para no pasarse.

---

## 9. Pestaña Files (ver `05` y `06`)

> 🕒 **Aplazado** (tarea 22), y solo con los paneles Auto Name, MP3 y WAV. Mientras tanto el núcleo graba en MP3 192 kbps con el nombre `[YYYY-MM-DD][hh-mm-ss]` en `Escritorio\Rebecca Listen Recordings` (tarea 12).

Panel lateral izquierdo azul claro con secciones **Auto Name · MP3 · OGG · WAV · FLAC**. La activa se resalta en blanco.

### 9.1 Auto Name

- **☑ Enable**. Si está desactivado, al pulsar grabar se abre un diálogo "Guardar como" antes de empezar.
- **Specify the destination folder** · input de solo lectura + botón **"…"** que abre el selector de carpetas. Por defecto `Escritorio\Rebecca Listen Recordings`, se crea si no existe.
- **Specify prefix for the file name** · input con "(Optional)".
- **Specify the naming convention** · desplegable con plantillas
  - `[YYYY-MM-DD][hh-mm-ss]` (por defecto)
  - `YYYY-MM-DD_hh-mm-ss`
  - `YYYYMMDD_hhmmss`
  - `[hh-mm-ss]`
  - `Recording_###` (contador incremental)
  - `Custom…` (permite escribir tokens `{YYYY} {MM} {DD} {hh} {mm} {ss} {source} {n}`)
- Desplegable de formato **.mp3 / .ogg / .wav / .flac**.
- **For example** · vista previa en gris de la ruta final que se actualiza en vivo, truncando el medio de la ruta con "…" si no cabe (ej. `C:\Users\USER\Des… \[2026-09-28][22-48-41].mp3`).
- Si el nombre ya existe, añade sufijo ` (1)`, ` (2)`.
- Valida caracteres prohibidos de Windows `<>:"/\|?*` en el prefijo.

### 9.2 MP3

- **Sample rate** · 8000, 11025, 16000, 22050, 32000, 44100, 48000 Hz (por defecto 48000).
- **Channels** · Mono / Stereo.
- **Mode** · ◉ CBR / ◯ VBR.
- **Bitrate** (CBR) · 32 a 320 kbps (por defecto 192). En VBR se sustituye por **Quality** V0 a V9.

### 9.3 OGG

- Sample rate, Channels, **Quality** −1 a 10 (por defecto 5, ~160 kbps).

### 9.4 WAV

- Sample rate, Channels, **Bit depth** 16 / 24 / 32 float.

### 9.5 FLAC

- Sample rate, Channels, **Bit depth** 16 / 24, **Compression level** 0 a 8 (por defecto 5).

---

## 10. Pestañas Hotkeys, System y About

> 🕒 **Aplazado**: Hotkeys y System (tareas 23, 30, 31). ⛔ **Eliminado**: la pestaña About y "Check for updates" — la versión se muestra al pie de System.

### 10.1 Hotkeys (ver `07_options_hotkeys.png`)

- Tabla de dos columnas **Commands | Key** con filas **File, Record, Pause, Play, Stop, Cut** (todas "None" por defecto).
- Al seleccionar una fila, el campo inferior "Press (new) hot key for selected command:" entra en modo captura. El usuario pulsa la combinación y se muestra (ej. `Ctrl+Alt+R`). Botón **Assign** la asigna.
- `Backspace` o `Supr` en el campo la deja en "None".
- Son **atajos globales** (`globalShortcut`), funcionan con la app en segundo plano o en la bandeja.
- Detecta conflictos entre comandos y si el sistema rechaza el registro (otra app lo usa), muestra el error en rojo bajo el campo.
- Significado de cada comando
  - File · abrir carpeta de destino.
  - Record · iniciar grabación (si ya graba, no hace nada).
  - Pause · pausar / reanudar.
  - Play · reproducir el último archivo.
  - Stop · detener.
  - Cut · split, cerrar archivo actual y seguir en uno nuevo.

### 10.2 System (ver `08_options_system.png`)

- ☐ **Minimize to tray** · al minimizar, la ventana se oculta y queda solo el icono de bandeja.
- ☐ **Always show tray icon** · el icono está siempre visible.
- ☐ **Always on top** · `setAlwaysOnTop(true)`.
- ☑ **Keep recording history** · la lista se guarda entre sesiones en `userData/history.json`. Si se desmarca, se pregunta si borrar el historial.
- Badge **Info** con el texto "The app does not manage your files. If you move, rename, or remove a file outside the app, the list will not update automatically. File storage and management remain your responsibility."
- Botón **Open Log File** abre el log actual con `shell.openPath`.
- Extras recomendados (en la misma pestaña, debajo de un separador)
  - ☐ Start with Windows.
  - ☐ Start recording on launch.
  - Idioma English / Español.
- **Menú de bandeja** · Record / Stop, Pause, Open Rebecca Listen, Open recordings folder, Options, Exit. El icono cambia a rojo mientras graba y el tooltip muestra el tiempo transcurrido.

### 10.3 About (ver `09_options_about.png`)

- Nombre de la app en negrita + badge de edición (usa "Free" o la versión) + línea "© 2026 Michael · Version x.y.z" leída de `package.json`.
- Mejora sugerida: enlace al repositorio y botón "Check for updates" con `electron-updater` (ya está en dependencias).

---

## 11. Perfiles (ver `10_profiles_manager.png`)

> ⛔ **Eliminado del proyecto.** Hay una sola configuración.

- Un perfil = snapshot completo de todos los settings de Options (Effects, VAS, FLL, Files, Hotkeys, System y el Source seleccionado).
- **Profiles Manager** · diálogo modal pequeño con
  - Lista con cabecera "Profile Name". Siempre existe **Default**, que no se puede borrar.
  - Botón **Remove** (deshabilitado para Default o sin selección).
  - Botón **OK** que cierra.
  - Input inferior + botón **Add** que crea un perfil nuevo copiando la configuración actual. Valida nombres vacíos y duplicados.
- Cambiar de perfil en el desplegable del pie de Options carga sus valores en el borrador. Apply / OK los guarda en ese perfil y lo marca como activo.
- Persistencia en `userData/settings.json` con `electron-store` y un schema versionado con migraciones.

---

## 12. Funciones extra detectadas en las capturas

> Estado por punto: **1 Schedule** ⛔ eliminado · **2 Smart Splits** 🕒 aplazado, reducido al botón Cut/Split (tarea 27) · **3 Format Conversion** ⛔ eliminado · **4 Trim** ⛔ eliminado · **5 Sin límite de duración** ✅ · **6 Monitoreo en Ready** ✅ (tarea 09).

1. **Schedule** (columna de la lista y del plan). Diálogo "Schedule recording" con fecha/hora de inicio, duración o hora de fin, repetición (una vez, diario, días de la semana) y source. Se abre con clic en el indicador Schedule o desde el menú de bandeja. La app debe estar abierta (o en bandeja) para ejecutarlo. Las filas programadas aparecen en la lista con la hora en la columna derecha.
2. **Smart Splits** · corresponde a Cut, VAS modo nuevo archivo y FLL modo nuevo archivo. Asegura que los tres usan el mismo mecanismo de corte sin pérdida.
3. **Format Conversion** · opción "Convert to…" del menú contextual, con ffmpeg, mostrando progreso en la fila.
4. **Trim Audio Clips** · diálogo con waveform completa del archivo, dos manijas de inicio/fin, reproducción de la selección y botón "Save as new file" o "Overwrite". Usa ffmpeg con `-ss`/`-to` y copia sin recodificar cuando el formato lo permita.
5. **Sin límite de duración** · el plan Basic limita a 5 min por sesión, el clon no tiene límite.
6. Monitoreo de nivel en estado Ready (VU meter activo aunque no se grabe).

---

## 13. Persistencia y archivos de la app

| Archivo | Contenido |
|---|---|
| `userData/settings.json` | perfiles, perfil activo, source, level, tamaño y posición de ventana |
| `userData/history.json` | lista `{ id, path, name, format, durationMs, sizeBytes, createdAt, source }` |
| `userData/schedules.json` | grabaciones programadas |
| `userData/logs/main.log` | log rotativo (5 MB × 3) |

---

## 14. Estilo visual

- Look "Windows 11 clásico" como en las capturas. Fondo blanco, fuente Segoe UI 12–13 px, grises suaves para etiquetas.
- Azul principal `#1E7BC4`, rojo grabación `#D9383A`, teal barra "•••" `#127C8C`, verde dispositivos de salida `#3A8A1E`, rojo dispositivos de entrada `#C0282D`.
- Soporta modo oscuro con variables CSS en `:root` y `prefers-color-scheme` (el original no lo tiene, es una mejora opcional).
- Iconos con `lucide-react`.
- Sin frameworks CSS pesados. CSS Modules o Tailwind, lo que sea más simple.

---

## 15. Plan de implementación por fases

> ⛔ **Obsoleto.** Lo sustituye el tablero de [tasks/00_README.md](tasks/00_README.md), que tiene otras fases y otra numeración. Se conserva solo para entender de dónde salió el plan.

Crea un archivo `plan/tasks/NN_nombre.md` por fase con su checklist y marca cada ítem al terminarlo.

1. **Fase 1 · Base.** Estructura de carpetas, `shared/ipc.ts`, settings con electron-store y perfiles, electron-log, ventana principal vacía con el layout completo (estático).
2. **Fase 2 · Dispositivos.** Sidecar Rust con cpal + WASAPI, enumeración con estado "Not plugged in", hot-plug, desplegable Source completo.
3. **Fase 3 · Captura y monitoreo.** Stream de PCM a main, slider Level, VU meter, waveform en vivo en estado Ready.
4. **Fase 4 · Grabación.** Encoder ffmpeg (4 formatos), Auto Name, cronómetro, máquina de estados, Record / Pause / Stop, archivo `.part` y recuperación.
5. **Fase 5 · Mezcla.** Modo Computer Sounds & Voice con resampler y compensación de deriva de reloj entre dispositivos.
6. **Fase 6 · Lista e historial.** Lista, reproducción, barra de progreso, menú contextual, drag out, Keep recording history.
7. **Fase 7 · Options.** Diálogo completo con las 7 pestañas, borrador + Apply/OK/Cancel, Profiles Manager.
8. **Fase 8 · DSP.** AGC y Noise Suppression con indicadores.
9. **Fase 9 · VAS y FLL.** Con pre-roll, hang time y cortes sin pérdida. Split / Cut.
10. **Fase 10 · Sistema.** Hotkeys globales, bandeja, always on top, minimize to tray, open log.
11. **Fase 11 · Extras.** Schedule, Convert, Trim.
12. **Fase 12 · Empaquetado.** `electron-builder` para Windows (NSIS), icono, sidecar y ffmpeg en `extraResources`, prueba de instalación limpia.

---

## 16. Criterios de aceptación

- Grabar 10 minutos de "Computer Sounds" en MP3 192 kbps produce un archivo de ~14 MB, reproducible, sin cortes ni desincronía.
- Con "Computer Sounds & Voice", voz y sistema quedan sincronizados (desfase < 20 ms tras 30 min). La tarea 16 primero **mide** el desfase real y solo construye la compensación si hace falta.
- ~~FLL por tamaño 1000 KB...~~ ⛔ eliminado con FLL.
- ~~VAS con umbral −26 dB...~~ ⛔ eliminado con VAS.
- Desconectar los audífonos seleccionados durante una grabación guarda el archivo sin corrupción y avisa al usuario.
- Los hotkeys funcionan con la ventana minimizada en la bandeja. 🕒 aplazado con las tareas 30 y 31.
- Cerrar la app a la fuerza durante una grabación deja un `.part` recuperable al reiniciar.
- CPU < 5 % en grabación simple y uso de memoria estable (sin fugas) tras 1 hora.

---

## 17. Fuera de alcance por ahora

- **Eliminado del proyecto el 2026-09-28** (ver "Alcance vigente"): AGC y supresión de ruido (§6), VAS (§7), FLL (§8), formatos OGG y FLAC (§9), pestaña About y actualizaciones (§10.3), perfiles (§11), Schedule (§12.1), conversión de formato (§12.3), recorte de audio (§12.4), reproductor propio con barra de progreso (§4.7) y menú contextual de la lista (§4.6), enumeración de dispositivos desconectados (§3.1), i18n y modo oscuro. Si alguna vez se quieren, se replanifican desde estas secciones con el siguiente número de tarea libre (37 en adelante).
- Soporte "de todo tipo de audio" ampliado (más formatos como AAC/M4A/OPUS, entrada de archivos variados) y afinamiento de grabación en tiempo real avanzado. **Se definirá en una fase posterior.** Deja el `Encoder` y el `AudioEngine` desacoplados para añadirlos sin reescribir.
- macOS y Linux.
- Licencias, activación y botón Upgrade.
