# Protocolo de `rl-capture`

Main lanza `resources/bin/rl-capture.exe` y habla con él por tres tuberías:

| Tubería | Dirección | Contenido |
|---|---|---|
| stdin | main → sidecar | Comandos JSON, uno por línea |
| stderr | sidecar → main | Respuestas y eventos JSON, uno por línea |
| stdout | sidecar → main | Solo PCM binario (tarea 08). Nunca texto |

Si stdin se cierra, el sidecar termina.

## Comandos (stdin)

Objeto JSON con el campo `cmd`. Los campos extra se ignoran.

| `cmd` | Estado | Respuesta |
|---|---|---|
| `list` | Implementado | Un evento `devices` (precedido de un `warning` por cada endpoint que no se pudo describir) |
| `open` | Tarea 08 | `error` con `code: "not_implemented"` |
| `start` | Tarea 08 | `error` con `code: "not_implemented"` |
| `stop` | Tarea 08 | `error` con `code: "not_implemented"` |

```json
{"cmd":"list"}
```

## Eventos (stderr)

Objeto JSON con el campo `type`.

### `devices`

Endpoints **activos** en este momento (WASAPI `DEVICE_STATE_ACTIVE`); los desconectados o deshabilitados no aparecen. Salidas primero, luego entradas. Cada elemento sigue `AudioDevice` de `src/shared/types.ts`:

```json
{"type":"devices","devices":[
  {"id":"wasapi:{0.0.0.00000000}.{db09e9e0-...}","name":"Altavoces","groupName":"Realtek(R) Audio",
   "kind":"render","isDefault":true,"channels":2,"sampleRate":48000}
]}
```

- `id`: id estable del endpoint (`DeviceId` de cpal).
- `name` / `groupName`: el nombre de Windows `"Altavoces (Realtek(R) Audio)"` partido por el último grupo de paréntesis. Sin grupo, ambos son el nombre completo.
- `kind`: `render` (se captura en loopback) o `capture` (micrófono, línea).
- `channels` / `sampleRate`: formato de mezcla por defecto del endpoint.

### `warning`

```json
{"type":"warning","message":"skipped a Render endpoint: ..."}
```

### `error`

```json
{"type":"error","code":"bad_command","message":"unknown variant `nope`, ..."}
```

| `code` | Cuándo |
|---|---|
| `bad_command` | La línea no es JSON válido o `cmd` no existe |
| `not_implemented` | Comando del protocolo aún no implementado; `message` es el comando |
| `enumeration_failed` | El host de audio no pudo listar los endpoints |

## PCM (stdout, tarea 08)

Secuencia de frames binarios, cada uno con cabecera little-endian seguida de las muestras:

```
[streamId u8][frameCount u32][frameCount × channels × f32le]
```

`channels` es el del stream abierto con `open`.
