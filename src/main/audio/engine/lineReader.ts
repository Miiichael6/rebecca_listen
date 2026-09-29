/**
 * Splits a text stream into lines, whatever the chunk boundaries are. Used on
 * the sidecar's stderr, where every line is one JSON event.
 */

export class LineReader {
  private pending = ''

  constructor(private readonly onLine: (line: string) => void) {}

  push(chunk: string): void {
    this.pending += chunk
    let newline = this.pending.indexOf('\n')
    while (newline >= 0) {
      const line = this.pending.slice(0, newline).replace(/\r$/, '')
      this.pending = this.pending.slice(newline + 1)
      if (line.trim() !== '') this.onLine(line)
      newline = this.pending.indexOf('\n')
    }
  }
}
