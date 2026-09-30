# 46 · Transcripción en vivo con RebeccaWrites al grabar

**Estado:** ✅ Terminada (prueba conjunta pendiente de la 27 de RebeccaWrites)
**Fase:** 6 — Lista · **Depende de:** 08, 17 · **Doc:** petición del usuario (2026-09-30)
**Pareja en RebeccaWrites:** tarea 27 (`rebeca_writes/plans/tasks/pending/27_transcripcion_en_vivo_desde_rebecca_listen.md`)

## Objetivo
Con la casilla **"Vincular Transcripción con RebeccaWrites"** marcada, al grabar (p. ej. "reunión teams") Rebecca Listen manda el audio a RebeccaWrites a la vez que lo graba y RebeccaWrites lo transcribe en tiempo real. **La transcripción solo se ve en RebeccaWrites**: Rebecca Listen no muestra texto. Con la casilla desmarcada, Rebecca Listen se comporta exactamente como hoy.

## Enfoque
- **Casilla:** "Vincular Transcripción con RebeccaWrites", **desmarcada por defecto**, guardada en settings (`transcription.linkRebeccaWrites`; `normalize()` rellena el valor en archivos viejos). Al marcarla se busca RebeccaWrites; si no está, se desmarca y aparece "RebeccaWrites no encontrada" con el botón "Localizar RebeccaWrites…" (ruta guardada en `transcription.rebeccaWritesExe`).
- **Localizar el exe:** clave de desinstalación de NSIS (`HKCU/HKLM\…\Uninstall\…` con `DisplayName = RebeccaWrites`; `InstallLocation` viene vacío, así que se saca la carpeta de `UninstallString`), con respaldo en `%LOCALAPPDATA%\Programs\RebeccaWrites\RebeccaWrites.exe` y, en último lugar, la ruta elegida a mano.
- **Audio en paralelo:** el `Pipeline` ya entrega las muestras con ganancia al `sink` mientras se graba. Un segundo consumidor (`LiveFeed`) las baja a mono, las remuestrea a 16 kHz (`dsp/resampler.ts`) y las añade como PCM s16le a un archivo que va creciendo. La pausa simplemente no añade nada.
- **Abrir RebeccaWrites:** si está cerrada, Listen la lanza; si está abierta, su `second-instance` recibe los argumentos. En los dos casos es la misma llamada.
- **Sin cambios en la grabación:** si falla algo del lado en vivo (no se puede lanzar, disco), la grabación sigue igual y solo sale un aviso en la StatusBar.

### Contrato entre las dos apps (igual en la tarea 27 de RebeccaWrites)
| Momento | Listen hace | RebeccaWrites hace |
|---|---|---|
| Empieza a grabar | Crea `%TEMP%\rebecca-live\<id>.pcm` (PCM s16le, 16 kHz, mono, sin cabecera) y ejecuta `RebeccaWrites.exe --live-start="<pcm>" --live-name="<nombre>"` | Crea una entrada "en vivo" en la barra lateral con ese nombre, la selecciona, lee el archivo según crece y transcribe por ventanas de ~30 s (`-l auto`, con su modelo y backend) |
| Graba / pausa | Añade muestras al `.pcm` (en pausa no añade) | Sigue leyendo; si no llega audio, espera |
| Para | Cierra el `.pcm` y ejecuta `RebeccaWrites.exe --live-end="<pcm>" --live-media="<ruta final .mp3/.wav>"` | Transcribe lo que falte, cambia la entrada a la grabación final (se puede reproducir y exportar como cualquier otra) y borra el `.pcm` |
| Listen se cierra de golpe | — | Si el `.pcm` lleva 2 min sin crecer y no llegó `--live-end`, cierra la entrada con lo transcrito |

`<id>` = marca de tiempo del inicio de la grabación; el nombre es el de la grabación (sin extensión).

## Pasos
- [x] 1. Settings `transcription.linkRebeccaWrites` (default `false`) y `transcription.rebeccaWritesExe` (default `null`) en `shared/types.ts` y `defaults.ts`, con validación en `settings/validate.ts` y test
- [x] 2. Main `rebeccaWrites/locate.ts`: rutas candidatas del exe (registro → ruta por defecto → manual). La parte que interpreta `UninstallString` es pura y tiene test
- [x] 3. Main `rebeccaWrites/liveArgs.ts`: argumentos de `--live-start` y `--live-end` (puro, con test); `rebeccaWrites/launch.ts`: lanzar el exe `detached` sin esperar
- [x] 4. Main `audio/live/pcm16k.ts`: Float32 intercalado de N canales a Int16 mono 16 kHz (downmix + `resampler` + conversión); puro, con test
- [x] 5. Main `audio/live/LiveFeed.ts`: abre el `.pcm`, recibe bloques, escribe en orden y cierra; errores → aviso sin parar la grabación
- [x] 6. Enganche en `RecordingSession`: si la casilla está marcada, al abrir el archivo se crea el `LiveFeed` y se lanza `--live-start`; al cerrar, `--live-end` con la ruta final; al abortar, `--live-end` sin `--live-media`
- [x] 7. IPC tipado `rebeccaWrites:locate` (diálogo de archivo que valida que sea `RebeccaWrites.exe`) y `rebeccaWrites:status` en `shared/ipc.ts` y preload
- [x] 8. Renderer: componente `RebeccaWritesLink/` con la casilla, el aviso "RebeccaWrites no encontrada" y "Localizar RebeccaWrites…", bajo el área de Source/Level
- [x] 9. Casilla desmarcada o sin RebeccaWrites: no se crea `.pcm` ni se lanza nada; la grabación es idéntica a la de antes
- [x] 10a. Verificación del lado de Listen con un `RebeccaWrites.exe` falso que registra sus argumentos: desmarcada no crea nada; marcada crea el `.pcm`, que crece y mide lo mismo que lo grabado (pausa excluida); `--live-start`/`--live-name`/`--live-end`/`--live-media` correctos
- [ ] 10. Verificación en la app real, las dos apps juntas (necesita la 27 de RebeccaWrites): grabar "reunión teams" con RebeccaWrites cerrada (se abre y transcribe), otra con ella abierta, pausar y seguir, parar (queda como grabación normal en RebeccaWrites y no queda `.pcm`), desmarcar la casilla (no pasa nada), probar con RebeccaWrites renombrada (sale "Localizar…")
- [x] 11. `npm run typecheck`, lint y tests en verde
- [x] 12. Commit: `feat(transcript): transcripción en vivo con RebeccaWrites al grabar`

## Criterios de aceptación
- [x] La casilla "Vincular Transcripción con RebeccaWrites" existe, viene desmarcada y recuerda su valor tras reiniciar
- [ ] Con la casilla marcada, al grabar, RebeccaWrites se abre (si hacía falta) y muestra el texto de lo que se está grabando a los pocos segundos, sin que el usuario haga nada
- [x] Rebecca Listen no muestra texto: la transcripción solo está en RebeccaWrites
- [ ] Al parar, la grabación queda en RebeccaWrites como una entrada normal con su transcripción, y no quedan `.pcm` en `%TEMP%\rebecca-live`
- [ ] Desmarcada, o sin RebeccaWrites, la grabación funciona igual; si falta RebeccaWrites se explica y se puede localizar a mano

## Fuera de alcance (por ahora)
- Transcribir al **reproducir** y mostrar el texto dentro de Rebecca Listen.
- Elegir modelo o idioma desde Rebecca Listen: los pone RebeccaWrites.
- Avisar a RebeccaWrites si luego se renombra o recorta la grabación en Listen.

## Bitácora
- 2026-09-30 — Tarea creada a petición del usuario: se transcribe mientras se graba y el texto solo se ve en RebeccaWrites. Conexión por archivo PCM que crece + argumentos `--live-start`/`--live-end` (aprovecha el `second-instance` de RebeccaWrites, sin servidor); si RebeccaWrites está cerrada, Listen la abre.
- 2026-09-30 — Medido (ventana de 30 s, RTX 3050): whisper CUDA medium factor 0,15; CPU medium 0,64. Con GPU va muy por delante del audio.
- 2026-09-30 — El exe elegido a mano va primero (antes que registro y ruta por defecto): si el usuario lo localizó, manda. El nombre real sale del desinstalador (`rebeccawrites.exe`, en minúsculas); se busca en el registro con `reg query /f RebeccaWrites /d /e` (~0,1 s, volcar HKLM entero tardaba 1,5 s).
- 2026-09-30 — `deferredSink` guarda los bloques mientras se localiza y lanza RebeccaWrites: la grabación no espera y el `.pcm` queda alineado con el archivo final (medido: 6,31 s en ambos).
- 2026-09-30 — Verificado con exe falso porque la 27 de RebeccaWrites sigue pendiente (la instalada metería el `.pcm` en su cola). Quedan para la prueba conjunta: paso 10 y criterios 2, 4 y el "Localizar…" con RebeccaWrites renombrada (no se desinstaló la real para probarlo).
- 2026-09-30 — Contrato cambiado a `--flag=valor` al probar con la 27 de RebeccaWrites: con ella ya abierta, Chromium entrega a `second-instance` las opciones delante y los valores sueltos al final, y `--flag valor` perdía la pareja.
