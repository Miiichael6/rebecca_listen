// Dev check of the resampler (task 15): decodes an audio file with ffmpeg,
// runs it through `Resampler` in 10 ms blocks and writes a WAV at the new
// rate, to listen for artifacts:
//
//   node --experimental-transform-types scripts/resample-wav.ts <in> <out.wav> [--rate 48000] [--ppm N]
//
// Unlike the app, ffmpeg-static is used straight from node_modules.
import { spawn } from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'
import { Resampler } from '../src/main/audio/dsp/resampler.ts'

const DEFAULT_OUT_RATE = 48_000
const BLOCK_MS = 10
const BYTES_PER_SAMPLE = 4

const args = process.argv.slice(2)
const flag = (name: string): number | undefined => {
  const at = args.indexOf(name)
  return at >= 0 ? Number(args[at + 1]) : undefined
}
const [inPath, outPath] = args.filter(
  (arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--')
)
if (!inPath || !outPath)
  throw new Error('Usage: resample-wav.ts <in> <out.wav> [--rate N] [--ppm N]')
const outRate = flag('--rate') ?? DEFAULT_OUT_RATE
const ffmpeg = ffmpegStatic as unknown as string

/** Sample rate and channels of the input, from what `ffmpeg -i` prints. */
async function probe(path: string): Promise<{ rate: number; channels: number }> {
  const child = spawn(ffmpeg, ['-hide_banner', '-i', path], { windowsHide: true })
  let text = ''
  child.stderr.on('data', (chunk) => (text += chunk))
  await new Promise((done) => child.on('close', done))
  // Some ffmpeg builds say "stereo", others "2 channels".
  const stream = /Audio: .*?, (\d+) Hz, (mono|stereo|(\d+) channels)/.exec(text)
  if (!stream) throw new Error(`No audio stream found in ${path}`)
  const channels = stream[3] ? Number(stream[3]) : stream[2] === 'mono' ? 1 : 2
  return { rate: Number(stream[1]), channels }
}

const { rate: inRate, channels } = await probe(inPath)
const resampler = new Resampler({ inRate, outRate, channels })
resampler.setRatioAdjust(flag('--ppm') ?? 0)

const pcm = ['-f', 'f32le', '-ac', String(channels)]
const decoder = spawn(ffmpeg, ['-v', 'error', '-i', inPath, ...pcm, '-'], { windowsHide: true })
const encoder = spawn(
  ffmpeg,
  ['-v', 'error', '-y', ...pcm, '-ar', String(outRate), '-i', '-', '-c:a', 'pcm_s16le', outPath],
  { windowsHide: true }
)
const write = (samples: Float32Array): void => {
  encoder.stdin.write(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength))
}

const blockBytes = ((inRate * BLOCK_MS) / 1000) * channels * BYTES_PER_SAMPLE
let pending = Buffer.alloc(0)
let framesIn = 0
let framesOut = 0
const started = performance.now()

for await (const chunk of decoder.stdout) {
  pending = Buffer.concat([pending, chunk])
  while (pending.length >= blockBytes) {
    // Copied so the samples are aligned for the Float32Array.
    const block = new Float32Array(
      pending.buffer.slice(pending.byteOffset, pending.byteOffset + blockBytes)
    )
    pending = pending.subarray(blockBytes)
    const out = resampler.process(block)
    framesIn += block.length / channels
    framesOut += out.length / channels
    write(out)
  }
}
const tailBytes = pending.length - (pending.length % (channels * BYTES_PER_SAMPLE))
const tail = new Float32Array(
  pending.buffer.slice(pending.byteOffset, pending.byteOffset + tailBytes)
)
const last = [resampler.process(tail), resampler.flush()]
framesIn += tail.length / channels
for (const out of last) {
  framesOut += out.length / channels
  write(out)
}
encoder.stdin.end()
await new Promise((done) => encoder.on('close', done))

const seconds = framesIn / inRate
console.info(`${inRate} Hz → ${outRate} Hz, ${channels} ch: ${framesIn} → ${framesOut} frames`)
console.info(
  `${seconds.toFixed(2)} s in ${(performance.now() - started).toFixed(0)} ms → ${outPath}`
)
