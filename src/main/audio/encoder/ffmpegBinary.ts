/**
 * Where the ffmpeg of `ffmpeg-static` lives. Packed builds keep it outside the
 * asar (`asarUnpack` in electron-builder.yml): a child process cannot run a
 * file from inside the archive.
 */

import ffmpegStatic from 'ffmpeg-static'

export function ffmpegPath(): string {
  if (!ffmpegStatic) throw new Error('ffmpeg-static has no binary for this platform')
  return ffmpegStatic.replace('app.asar', 'app.asar.unpacked')
}
