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

**Aplazado (5 tareas en [pending/despues/](pending/despues/)):** ~~20 ventana Options~~ (hecha 2026-09-30) · ~~22 pestaña Files~~ (hecha 2026-09-30) · ~~23 pestañas Hotkeys y System~~ (hecha 2026-09-30) · ~~27 botón Split~~ (hecha 2026-09-30) · **30** hotkeys globales · **31** bandeja y arranque con Windows. Se harán solo cuando el núcleo esté terminado y funcionando; para retomar una, se mueve a `pending/` y se pone ⬜ Pendiente.

**Eliminado del proyecto (11 tareas, 2026-09-28):** ~~reproductor propio · menú contextual~~ (recuperados en la 17, 2026-09-29) · Properties y arrastrar fuera · pestañas Effects/VAS/FLL · perfiles de configuración · AGC · supresión de ruido (RNNoise) · VAS · FLL · Schedule · convertir formato · recortar audio. No están en ninguna carpeta: si alguna vez se quieren, se replanifican desde la spec (§6–§8, §11, §12) con el siguiente número libre (37 en adelante).

Además se recortó dentro de las tareas del núcleo:

| Recorte | Qué se hace en su lugar |
|---|---|
| Dispositivos desconectados y hot-plug por COM | El sidecar solo lista lo usable ahora con `cpal`; main sondea la lista cada 2 s |
| OGG y FLAC | MP3 (uso normal) y WAV (sin pérdida); añadir otro formato es una entrada más en el mapa de args de 11 |
| ~~Reproductor propio con barra de progreso~~ | Recuperado en la 17: `PlaybackBar` dentro de la app; "Open with default app" abre el de Windows |
| Capa de i18n y ~~modo oscuro~~ | Textos en inglés en los componentes; tema oscuro único de `images/app.png` (17) |
| Diálogo de recuperación de `.part` | Se repara solo al arrancar y se añade a la lista |
| Estados `waiting` y `scheduled` de la máquina | Solo `idle`, `recording` y `paused` |
| Plantillas de nombre, prefijo y "Guardar como" | ~~Un solo nombre~~ → plantillas, prefijo y Save as hechos en 22 (2026-09-30) |
| Compensación de deriva en la mezcla | Medida en 16: 0 ppm con el micro USB, sin compensar; `Mixer.setRatioAdjust` queda listo si otro hardware lo pide |

## Decisiones pendientes (bloquean tareas)

- [x] **D1** ~~Toolchain de Rust para el sidecar de captura (§3.2).~~ **Resuelta 2026-09-29:** instalados Rust 1.98.1 (`stable-x86_64-pc-windows-msvc`) y Visual Studio Community 2022 con el workload VCTools. `cargo` compila y enlaza; `cpal` 0.18.2 enumera los dispositivos sin la crate `windows`. Desbloquea **05** y la cadena de audio (06–10, 13 en adelante).
- [x] **D2** ~~Actualizaciones: ¿hay un repositorio (p. ej. GitHub Releases) para publicar con `electron-updater`, o se quita `electron-updater` y el bloque `publish` que hoy apunta a `example.com`? (la pestaña About y "Check for updates" ya están eliminados) → afecta **35** (paso 1)~~ **Resuelta 2026-09-30:** GitHub Releases (`Miiichael6/rebecca_listen`), ver tarea 44.
- [x] **D3** ~~Firma del instalador: ¿se distribuye sin firmar o hay certificado? → afecta **35** (paso 1)~~ **Resuelta 2026-09-30:** sin firmar; SmartScreen avisa en la primera instalación.

## Tablero

| # | Tarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| 01 | [Estructura base y herramientas](done/01_estructura_y_herramientas.md) | 1 Base | — | ✅ Terminada |
| 02 | [Canales IPC tipados, defaults y preload](done/02_ipc_tipado_y_defaults.md) | 1 Base | 01 | ✅ Terminada |
| 03 | [Settings persistentes y logging](done/03_settings_y_log.md) | 1 Base | 02 | ✅ Terminada |
| 04 | [Layout estático de la ventana principal](done/04_layout_principal_estatico.md) | 1 Base | 01, 02 | ✅ Terminada |
| 05 | [Sidecar Rust: enumeración de dispositivos activos](done/05_sidecar_rust_enumeracion.md) | 2 Dispositivos | 02 | ✅ Terminada |
| 06 | [Sondeo de dispositivos y motor de audio en main](done/06_hotplug_y_motor_en_main.md) | 2 Dispositivos | 05 | ✅ Terminada (hot-plug físico se prueba en 07) |
| 07 | [Desplegable Source completo](done/07_desplegable_source.md) | 2 Dispositivos | 04, 06 | ✅ Terminada (falta probar hot-plug con hardware real) |
| 08 | [Stream PCM del sidecar a main](done/08_stream_pcm_sidecar.md) | 3 Captura | 06 | ✅ Terminada (`device_lost` falta probar con hardware real) |
| 09 | [DSP base: gain, meter, waveform y monitoreo](done/09_dsp_gain_meter_waveform.md) | 3 Captura | 08 | ✅ Terminada |
| 10 | [UI de Level, VU meter y waveform en vivo](done/10_ui_level_vu_waveform.md) | 3 Captura | 04, 09 | ✅ Terminada |
| 11 | [Encoder ffmpeg (MP3 y WAV)](done/11_encoder_ffmpeg.md)* | 4 Grabación | 02 | ✅ Terminada (escucha 4.1 pendiente del usuario) |
| 12 | [Nombres automáticos y carpeta de destino](done/12_nombres_automaticos.md)* | 4 Grabación | 03 | ✅ Terminada |
| 13 | [Sesión de grabación y máquina de estados](done/13_sesion_y_maquina_de_estados.md) | 4 Grabación | 07, 10, 11, 12 | ✅ Terminada (falta prueba física con Bluetooth) |
| 14 | [Recuperación de archivos .part](done/14_recuperacion_part.md) | 4 Grabación | 13 | ✅ Terminada |
| 15 | [Resampler con ratio ajustable](done/15_resampler.md) | 5 Mezcla | 09 | ✅ Terminada (paso 3.1 espera la escucha del usuario) |
| 16 | [Mezcla de sistema + micrófono](done/16_mixer_y_deriva.md) | 5 Mezcla | 13, 15 | ✅ Terminada (paso 3 y escucha de 5 min pendientes del usuario) |
| 17 | [Historial, lista de grabaciones y abrir archivos](done/17_historial_y_lista.md) | 6 Lista | 13 | ✅ Terminada |
| 20 | [Ventana Options, pestañas y borrador](done/20_options_ventana_y_borrador.md) | 7 Options | 03, 04 | ✅ Terminada |
| 22 | [Pestaña Files (Auto Name y formatos)](done/22_pestana_files.md) | 7 Options | 12, 20 | ✅ Terminada |
| 23 | [Pestañas Hotkeys y System](done/23_pestanas_hotkeys_y_system.md) | 7 Options | 20 | ✅ Terminada (registro global y efectos en 30 y 31) |
| 27 | [Corte sin pérdida (Smart Split) y botón Split](done/27_corte_sin_perdida_split.md) | 9 Split | 13 | ✅ Terminada (escucha en Audacity pendiente del usuario) |
| 30 | [Hotkeys globales](pending/despues/30_hotkeys_globales.md) | 10 Sistema | 23, 27 | ⬜ Después |
| 31 | [Bandeja, opciones de sistema e idioma](pending/despues/31_bandeja_y_opciones_sistema.md) | 10 Sistema | 17, 23, 30 | ⬜ Después |
| 35 | [Empaquetado Windows (NSIS)](done/35_empaquetado_nsis.md) | 12 Empaquetado | 17 | ✅ Terminada (abrir en el reproductor de Windows pendiente del usuario) |
| 36 | [Pruebas de aceptación y rendimiento](pending/36_pruebas_de_aceptacion.md) | 12 Empaquetado | 35 | ⬜ Pendiente |
| 37 | [Menú de archivo ampliado y botón de carpeta](done/37_menu_archivo_ampliado.md) | 6 Lista | 17 | ✅ Terminada |
| 38 | [Elegir la carpeta de las grabaciones](done/38_elegir_carpeta_de_grabaciones.md) | 6 Lista | 12, 17 | ✅ Terminada (prueba en vivo pendiente del usuario) |
| 39 | [Barra de título con los colores de la app](done/39_barra_de_titulo_integrada.md) | 1 Base | 04 | ✅ Terminada (prueba en vivo pendiente del usuario) |
| 40 | ["Open file location" abre el Explorador](done/40_abrir_ubicacion_con_explorer.md) | 6 Lista | 37 | ✅ Terminada (prueba en vivo pendiente del usuario) |
| 41 | [Micrófono del modo mixto](done/41_microfono_del_mix.md) | 6 Lista | 16, 07 | ✅ Terminada (prueba en vivo pendiente del usuario) |
| 42 | [Arquitectura hexagonal en los componentes grandes](done/42_arquitectura_hexagonal_componentes.md) | 6 Lista | 17, 37 | ✅ Terminada |
| 43 | [Barra de transporte unificada](pending/despues/43_barra_de_transporte_unificada.md) | 6 Lista | 13, 17, 42 | ⬜ Después |
| 44 | [Actualizar desde la app](done/44_actualizar_desde_la_app.md) | 12 Empaquetado | 35 | ✅ Terminada (falta probar con un release real) |
| 46 | [Transcripción en vivo con RebeccaWrites al grabar](done/46_transcripcion_en_vivo_rebeccawrites.md) | 6 Lista | 08, 17 | ✅ Terminada (prueba conjunta pendiente de la 27 de RebeccaWrites) |

\* **No dependen del sidecar**: 11 y 12 se adelantan a su fase porque solo necesitan 02 y 03. Con D1 ya resuelta (2026-09-29) el orden natural vuelve a ser el numérico.

Si una tarea se subdivide, sus subtareas van en filas justo debajo de ella: `| 13.1 | ↳ [Título](pending/13.1_nombre.md) | 4 Grabación | 13 | ⬜ Pendiente |`

## Diagrama de dependencias

Solo el núcleo (01–17, 35, 36). Las tareas de `despues/` se enganchan después de estas.

```
Base y trabajo sin sidecar
  01 → 02 ─┬→ 03 → 12
           ├→ 04
           └→ 11

Audio
  02 → 05 → 06 ─┬→ 07 (+04)
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
