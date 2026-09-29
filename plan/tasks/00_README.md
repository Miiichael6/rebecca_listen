# Tareas — Rebecca Listen

Documento fuente: [../PROMPT_rebecca_listen.md](../PROMPT_rebecca_listen.md) · Capturas de referencia: [images/](images/)

## Cómo se usa

- Cada archivo `NN_nombre.md` es una tarea. Se hacen **en orden numérico** salvo que las dependencias digan otra cosa.
- Cada tarea tiene un **Estado** general y una lista de **pasos** con casilla.
- Al marcar un paso: `- [ ]` → `- [x]`.
- Solo si una tarea es **muy compleja** (no es lo habitual), se **subdivide** en `NN.1_nombre.md`, `NN.2_nombre.md`... Cada subtarea enlaza a su padre (`**Tarea padre:**`) y la padre las lista en su sección `## Subtareas`. La padre no se cierra hasta que todas sus subtareas estén ✅.
- Al cerrar cada **fase**, la app debe arrancar (`npm run dev`), pasar `npm run typecheck` y `npm run lint` (§1.1 de la spec) y se hace commit.
- En la sección **Bitácora** de cada archivo se anotan decisiones, problemas y fecha de cierre.
- Cada archivo vive en la carpeta que corresponde a su estado, y al moverlo se actualiza su enlace y su estado en el **Tablero** (y en la padre, si es subtarea):

  | Carpeta | Cuándo |
  |---|---|
  | [pending/](pending/) | Tarea no iniciada (⬜) o bloqueada (⛔) |
  | [pending/despues/](pending/despues/) | Tareas aplazadas a propósito (⬜ Después); no se hacen hasta terminar el núcleo |
  | [in_progress/](in_progress/) | Al **empezar** a trabajarla (🔄). Solo una familia a la vez (padre + su subtarea activa) |
  | [done/](done/) | Al **terminarla** (✅), con todos sus pasos, criterios y subtareas cumplidos |

### Leyenda de estados

| Estado | Significado |
|---|---|
| ⬜ Pendiente | No iniciada |
| ⬜ Después | No iniciada y aplazada a propósito: vive en [pending/despues/](pending/despues/) y no forma parte del núcleo actual |
| 🔄 En progreso | Se está trabajando |
| ✅ Terminada | Todos los pasos, criterios y subtareas cumplidos |
| ⛔ Bloqueada | Espera una decisión o a otra tarea |

## Alcance actual

**Núcleo (19 tareas):** grabar el sonido del equipo, el micrófono o los dos a la vez, que el archivo se guarde solo y se pueda encontrar y escuchar, más instalador y pruebas: **01–17, 35 y 36**. Es lo que el original da en su plan Basic (micrófono, sistema y ambos), sin el límite de 5 min.

**Aplazado (6 tareas en [pending/despues/](pending/despues/)):** **20** ventana Options · **22** pestaña Files (carpeta, formato, bitrate) · **23** pestañas Hotkeys y System · **27** botón Split · **30** hotkeys globales · **31** bandeja y arranque con Windows. Se harán solo cuando el núcleo esté terminado y funcionando; para retomar una, se mueve a `pending/` y se pone ⬜ Pendiente.

**Eliminado del proyecto (11 tareas, 2026-09-28):** reproductor propio · menú contextual, Properties y arrastrar fuera · pestañas Effects/VAS/FLL · perfiles de configuración · AGC · supresión de ruido (RNNoise) · VAS · FLL · Schedule · convertir formato · recortar audio. No están en ninguna carpeta: si alguna vez se quieren, se replanifican desde la spec (§6–§8, §11, §12) con el siguiente número libre (37 en adelante).

Además se recortó dentro de las tareas del núcleo:

| Recorte | Qué se hace en su lugar |
|---|---|
| Dispositivos desconectados y hot-plug por COM | El sidecar solo lista lo usable ahora con `cpal`; main sondea la lista cada 2 s |
| OGG y FLAC | MP3 (uso normal) y WAV (sin pérdida); añadir otro formato es una entrada más en el mapa de args de 11 |
| Reproductor propio con barra de progreso | Doble clic abre el archivo en el reproductor de Windows |
| Capa de i18n y modo oscuro | Textos en inglés en los componentes y solo el tema claro del original |
| Diálogo de recuperación de `.part` | Se repara solo al arrancar y se añade a la lista |
| Estados `waiting` y `scheduled` de la máquina | Solo `idle`, `recording` y `paused` |
| Plantillas de nombre, prefijo y "Guardar como" | Un solo nombre: `[YYYY-MM-DD][hh-mm-ss]` (las plantillas vuelven con 22) |
| Compensación de deriva en la mezcla | Primero se **mide** con el hardware real; solo se construye si el desfase molesta (decisión en 16) |

## Decisiones pendientes (bloquean tareas)

- [ ] **D1** El sidecar de captura (§3.2) necesita **Rust** (`rustup`, toolchain `stable-x86_64-pc-windows-msvc`) y **Visual Studio Build Tools** con "Desktop development with C++" (enlazador MSVC y Windows SDK). Hoy no están instalados (`cargo` no existe y en `Microsoft Visual Studio` solo hay `Installer/` y `Shared/`). ¿Los instalas tú (recomendado, es lo que pide la spec) o prefieres otro enfoque de captura? → bloquea **05** y, por cadena, todo lo que necesita audio real (06–10, 13 en adelante)
- [ ] **D2** Actualizaciones: ¿hay un repositorio (p. ej. GitHub Releases) para publicar con `electron-updater`, o se quita `electron-updater` y el bloque `publish` que hoy apunta a `example.com`? (la pestaña About y "Check for updates" ya están eliminados) → afecta **35** (paso 1)
- [ ] **D3** Firma del instalador: ¿se distribuye sin firmar (Windows SmartScreen avisará al instalar) o hay un certificado de firma de código? → afecta **35** (paso 1)

## Tablero

| # | Tarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| 01 | [Estructura base y herramientas](done/01_estructura_y_herramientas.md) | 1 Base | — | ✅ Terminada |
| 02 | [Canales IPC tipados, defaults y preload](pending/02_ipc_tipado_y_defaults.md) | 1 Base | 01 | ⬜ Pendiente |
| 03 | [Settings persistentes y logging](pending/03_settings_y_log.md) | 1 Base | 02 | ⬜ Pendiente |
| 04 | [Layout estático de la ventana principal](pending/04_layout_principal_estatico.md) | 1 Base | 01, 02 | ⬜ Pendiente |
| 05 | [Sidecar Rust: enumeración de dispositivos activos](pending/05_sidecar_rust_enumeracion.md) | 2 Dispositivos | 02 | ⛔ Bloqueada (D1) |
| 06 | [Sondeo de dispositivos y motor de audio en main](pending/06_hotplug_y_motor_en_main.md) | 2 Dispositivos | 05 | ⬜ Pendiente |
| 07 | [Desplegable Source completo](pending/07_desplegable_source.md) | 2 Dispositivos | 04, 06 | ⬜ Pendiente |
| 08 | [Stream PCM del sidecar a main](pending/08_stream_pcm_sidecar.md) | 3 Captura | 06 | ⬜ Pendiente |
| 09 | [DSP base: gain, meter, waveform y monitoreo](pending/09_dsp_gain_meter_waveform.md) | 3 Captura | 08 | ⬜ Pendiente |
| 10 | [UI de Level, VU meter y waveform en vivo](pending/10_ui_level_vu_waveform.md) | 3 Captura | 04, 09 | ⬜ Pendiente |
| 11 | [Encoder ffmpeg (MP3 y WAV)](pending/11_encoder_ffmpeg.md)* | 4 Grabación | 02 | ⬜ Pendiente |
| 12 | [Nombres automáticos y carpeta de destino](pending/12_nombres_automaticos.md)* | 4 Grabación | 03 | ⬜ Pendiente |
| 13 | [Sesión de grabación y máquina de estados](pending/13_sesion_y_maquina_de_estados.md) | 4 Grabación | 07, 10, 11, 12 | ⬜ Pendiente |
| 14 | [Recuperación de archivos .part](pending/14_recuperacion_part.md) | 4 Grabación | 13 | ⬜ Pendiente |
| 15 | [Resampler con ratio ajustable](pending/15_resampler.md) | 5 Mezcla | 09 | ⬜ Pendiente |
| 16 | [Mezcla de sistema + micrófono](pending/16_mixer_y_deriva.md) | 5 Mezcla | 13, 15 | ⬜ Pendiente |
| 17 | [Historial, lista de grabaciones y abrir archivos](pending/17_historial_y_lista.md) | 6 Lista | 13 | ⬜ Pendiente |
| 20 | [Ventana Options, pestañas y borrador](pending/despues/20_options_ventana_y_borrador.md) | 7 Options | 03, 04 | ⬜ Después |
| 22 | [Pestaña Files (Auto Name y formatos)](pending/despues/22_pestana_files.md) | 7 Options | 12, 20 | ⬜ Después |
| 23 | [Pestañas Hotkeys y System](pending/despues/23_pestanas_hotkeys_y_system.md) | 7 Options | 20 | ⬜ Después |
| 27 | [Corte sin pérdida (Smart Split) y botón Split](pending/despues/27_corte_sin_perdida_split.md) | 9 Split | 13 | ⬜ Después |
| 30 | [Hotkeys globales](pending/despues/30_hotkeys_globales.md) | 10 Sistema | 23, 27 | ⬜ Después |
| 31 | [Bandeja, opciones de sistema e idioma](pending/despues/31_bandeja_y_opciones_sistema.md) | 10 Sistema | 17, 23, 30 | ⬜ Después |
| 35 | [Empaquetado Windows (NSIS)](pending/35_empaquetado_nsis.md) | 12 Empaquetado | 17 | ⬜ Pendiente |
| 36 | [Pruebas de aceptación y rendimiento](pending/36_pruebas_de_aceptacion.md) | 12 Empaquetado | 35 | ⬜ Pendiente |

\* **No dependen del sidecar (D1)**: 11 y 12 se pueden hacer mientras D1 sigue abierta. Orden práctico si D1 tarda: 01 → 02 → 03 → 04 → 11 → 12 y luego 05 en adelante.

Si una tarea se subdivide, sus subtareas van en filas justo debajo de ella: `| 13.1 | ↳ [Título](pending/13.1_nombre.md) | 4 Grabación | 13 | ⬜ Pendiente |`

## Diagrama de dependencias

Solo el núcleo (01–17, 35, 36). Las tareas de `despues/` se enganchan después de estas.

```
Base y trabajo sin sidecar
  01 → 02 ─┬→ 03 → 12
           ├→ 04
           └→ 11

Audio (requiere D1)
  02 → 05⛔ → 06 ─┬→ 07 (+04)
                  └→ 08 → 09 ─┬→ 10 (+04)
                              └→ 15

Grabación, mezcla, lista y cierre
  07 + 10 + 11 + 12 → 13 ─┬→ 14
                          ├→ 16 (+15)
                          └→ 17 → 35 → 36
```

Aplazado (`despues/`): 20 → 22 / 23 → 30 → 31 · 27 (independiente, solo necesita 13)

Fases: 1 Base (01–04) · 2 Dispositivos (05–07) · 3 Captura y monitoreo (08–10) · 4 Grabación (11–14) · 5 Mezcla (15–16) · 6 Lista e historial (17) · 7 Options (20, 22, 23) · 9 Split (27) · 10 Sistema (30–31) · 12 Empaquetado (35–36)

Los números y las fases no se renumeran al eliminar tareas: los huecos (18, 19, 21, 24–26, 28, 29, 32–34, y las fases 8 y 11) son a propósito, para que las bitácoras y los commits sigan cuadrando.
