/**
 * `rl-media://recording/<id>`: lets the renderer play a recording in an
 * `<audio>` element without opening `file://` to it. Only ids of the history
 * are served, and `Range` requests are answered so seeking works.
 */

import { createReadStream, statSync } from 'fs'
import { Readable } from 'stream'
import { protocol } from 'electron'
import { MEDIA_SCHEME } from '@shared/defaults'
import type { AudioFormat } from '@shared/types'
import { history } from '../history'

const MIME: Record<AudioFormat, string> = { wav: 'audio/wav', mp3: 'audio/mpeg' }

/** Must run before `app.whenReady()`: media streaming needs a privileged scheme. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, stream: true } }
  ])
}

/** First and last byte asked by a `Range: bytes=a-b` header, clamped to the file. */
export function parseRange(header: string | null, size: number): [number, number] | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  return start <= end && start < size ? [start, end] : null
}

export function handleMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, (request) => {
    const id = new URL(request.url).pathname.slice(1)
    const item = history.get(id)
    if (!item) return new Response(null, { status: 404 })

    let size: number
    try {
      size = statSync(item.path).size
    } catch {
      return new Response(null, { status: 404 })
    }

    const headers = { 'Content-Type': MIME[item.format], 'Accept-Ranges': 'bytes' }
    const range = parseRange(request.headers.get('range'), size)
    const [start, end] = range ?? [0, size - 1]
    const body = Readable.toWeb(createReadStream(item.path, { start, end })) as ReadableStream
    return new Response(body, {
      status: range ? 206 : 200,
      headers: {
        ...headers,
        'Content-Length': String(end - start + 1),
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {})
      }
    })
  })
}
