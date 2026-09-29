// Dev check of the PCM stream (task 08): opens the default output in loopback
// (or the default input with `--capture`) through the sidecar, writes what
// arrives to a .raw file and prints the format to play it back:
//
//   node --experimental-transform-types scripts/dump-stream.ts [out.raw] [--capture] [--seconds N]
//   ffplay -f f32le -ar <rate> -ac <channels> out.raw
//
// Loopback sends nothing while the system is silent; the gap between the
// seconds received and the seconds elapsed is what main fills with zeros.
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { FrameDemuxer } from '../src/main/audio/engine/frameDemuxer.ts'

const DEFAULT_SECONDS = 5
const STREAM_ID = 1

const args = process.argv.slice(2)
const kind = args.includes('--capture') ? 'capture' : 'render'
const secondsFlag = args.indexOf('--seconds')
const secondsValue = secondsFlag >= 0 ? secondsFlag + 1 : -1
const seconds = secondsValue >= 0 ? Number(args[secondsValue]) : DEFAULT_SECONDS
const output = args.find((arg, index) => !arg.startsWith('--') && index !== secondsValue)
const outPath = output ?? `dump-${kind}.raw`

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sidecar = spawn(join(root, 'resources', 'bin', 'rl-capture.exe'), [], { windowsHide: true })
const send = (command: object): void => {
  sidecar.stdin.write(`${JSON.stringify(command)}\n`)
}

const file = createWriteStream(outPath)
let framesReceived = 0
let blocks = 0
let openedAt = 0
let format = { sampleRate: 0, channels: 0 }

const demuxer = new FrameDemuxer((block) => {
  blocks += 1
  framesReceived += block.samples.length / block.channels
  file.write(Buffer.from(block.samples.buffer, block.samples.byteOffset, block.samples.byteLength))
})
sidecar.stdout.on('data', (chunk: Buffer) => demuxer.push(chunk))

function finish(): void {
  send({ cmd: 'stop', streamId: STREAM_ID })
  sidecar.stdin.end()
  file.end(() => {
    const elapsed = (Date.now() - openedAt) / 1000
    const received = framesReceived / format.sampleRate
    console.log(
      `wrote ${outPath}: ${blocks} blocks, ${received.toFixed(2)} s in ${elapsed.toFixed(2)} s`
    )
    console.log(`play: ffplay -f f32le -ar ${format.sampleRate} -ac ${format.channels} ${outPath}`)
  })
}

createInterface({ input: sidecar.stderr }).on('line', (line) => {
  const event = JSON.parse(line)
  if (event.type === 'devices') {
    const device = event.devices.find((d: { kind: string; isDefault: boolean }) => {
      return d.kind === kind && d.isDefault
    })
    if (!device) throw new Error(`no default ${kind} device`)
    console.log(`opening "${device.name}" (${kind})`)
    send({ cmd: 'open', streamId: STREAM_ID, deviceId: device.id, kind })
  } else if (event.type === 'opened') {
    format = event
    openedAt = Date.now()
    console.log(`opened: ${event.sampleRate} Hz, ${event.channels} ch; recording ${seconds} s`)
    setTimeout(finish, seconds * 1000)
  } else if (event.type === 'stream_error' || event.type === 'error') {
    console.error(line)
    process.exit(1)
  }
})

send({ cmd: 'list' })
