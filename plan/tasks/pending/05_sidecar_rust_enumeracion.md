# 05 · Sidecar Rust: enumeración de dispositivos activos

**Estado:** ⛔ Bloqueada (D1)
**Fase:** 2 — Dispositivos · **Depende de:** 02 · **Doc:** [§3.1, §3.2](../../PROMPT_rebecca_listen.md) · **Ref:** `images/01_source_dropdown_devices.png`

## Objetivo
Existe un binario Rust `native/` (`rl-capture.exe`) que, con el comando `list` por stdin, devuelve en JSON los dispositivos de audio **usables en este momento** (salidas y entradas), con su grupo de hardware y cuál es el de defecto de cada tipo, usando solo `cpal`.

## Pasos

### Paso 1 — Proyecto Rust
- [ ] `cargo new native --name rl-capture` (binario), dependencias `cpal`, `serde`, `serde_json` — **sin la crate `windows`**: no se enumeran dispositivos desconectados ni se usa COM
- [ ] `native/.gitignore` con `target/`
- [ ] Script npm `build:native`: `cargo build --release --manifest-path native/Cargo.toml` y copia a `resources/bin/rl-capture.exe` (script Node `scripts/copy-native.mjs`)

### Paso 2 — Protocolo de comandos
- [ ] Bucle que lee stdin línea a línea y parsea `{"cmd": "list" | "open" | "start" | "stop", ...}` (solo `list` implementado aquí; el resto responde `not_implemented`)
- [ ] Respuestas y eventos JSON por línea en **stderr** (`{"type":"devices","devices":[...]}`, `{"type":"error",...}`); stdout queda reservado para PCM (08)
- [ ] Documentar el protocolo en `native/PROTOCOL.md` (comandos, respuestas, cabecera binaria `[streamId u8][frameCount u32]` + f32le)

### Paso 3 — Enumeración con cpal
- [ ] `host.output_devices()` → `kind: 'render'` (se abrirán en loopback); `host.input_devices()` → `kind: 'capture'`
- [ ] `default_output_device()` y `default_input_device()` para marcar `isDefault`
- [ ] `channels` y `sampleRate` desde `default_output_config()` / `default_input_config()`
- [ ] `id` = nombre completo del endpoint + `kind` (cpal no expone el id interno). Es único porque el nombre incluye el hardware entre paréntesis

### Paso 4 — Nombre y grupo
- [ ] **Confirmar primero** que en Windows `Device::name()` devuelve el nombre con el hardware entre paréntesis (`"Altavoces (Realtek(R) Audio)"`); anotar el formato real en Bitácora
- [ ] `parse_endpoint_name()`: separa por el **último** grupo de paréntesis → `name: "Altavoces"`, `groupName: "Realtek(R) Audio"`
- [ ] Si no hay paréntesis, `groupName` = nombre completo

### Paso 5 — Tests
- [ ] `cargo test`: parser de comandos (válido, JSON roto, comando desconocido)
- [ ] `parse_endpoint_name`: paréntesis anidados (`Realtek(R) Audio`), sin paréntesis, varios grupos de paréntesis, nombre vacío
- [ ] Serialización de `AudioDevice` con los mismos nombres de campo que `src/shared/types.ts`

### Paso 6 — Verificación
- [ ] `echo {"cmd":"list"} | resources/bin/rl-capture.exe` lista los mismos dispositivos **activos** que el panel de Sonido de Windows, agrupados como en la captura 01 (sin las filas grises "Not plugged in")
- [ ] `cargo test` pasa; `npm run typecheck` y `npm run lint` pasan
- [ ] Commit: `feat(native): sidecar rust con enumeración de dispositivos`

## Criterios de aceptación
- [ ] El JSON lista todos los dispositivos usables ahora, de entrada y de salida, sin duplicados
- [ ] Cada dispositivo trae `groupName` correcto (p. ej. "Realtek(R) Audio", "VB-Audio Virtual Cable")
- [ ] `npm run build:native` deja el binario en `resources/bin/`

## Bitácora
- _(fecha — nota)_
