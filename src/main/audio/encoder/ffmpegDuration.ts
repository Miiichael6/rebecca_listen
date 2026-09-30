/** Reads the length of a file from what `ffmpeg -i <file>` prints. Pure. */

const DURATION = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/
const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

/** `Duration: 00:01:02.34` → 62 340; `null` when ffmpeg could not tell (`N/A`, no line). */
export function parseDurationMs(ffmpegOutput: string): number | null {
  const match = DURATION.exec(ffmpegOutput)
  if (!match) return null
  const [, hours, minutes, seconds] = match
  const totalSeconds =
    (Number(hours) * MINUTES_PER_HOUR + Number(minutes)) * SECONDS_PER_MINUTE + Number(seconds)
  return Math.round(totalSeconds * MS_PER_SECOND)
}
