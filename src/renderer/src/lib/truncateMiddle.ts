const ELLIPSIS = '…'

/**
 * Shortens `text` to `maxLength` characters by cutting its middle, so both the
 * start of a path and the file name stay readable: `C:\Users\Des…\a.mp3`.
 */
export function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const kept = Math.max(0, maxLength - ELLIPSIS.length)
  const head = Math.ceil(kept / 2)
  return `${text.slice(0, head)}${ELLIPSIS}${text.slice(text.length - (kept - head))}`
}
