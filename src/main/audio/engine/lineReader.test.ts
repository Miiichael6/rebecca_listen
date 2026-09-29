import { describe, expect, it } from 'vitest'
import { LineReader } from './lineReader'
import { parseSidecarEvent } from './sidecarMessages'

function reader(): { lines: string[]; reader: LineReader } {
  const lines: string[] = []
  return { lines, reader: new LineReader((line) => lines.push(line)) }
}

describe('LineReader', () => {
  it('joins a line split across chunks', () => {
    const { lines, reader: lineReader } = reader()
    lineReader.push('{"type":"sto')
    lineReader.push('pped","streamId":1}\n')
    expect(lines).toEqual(['{"type":"stopped","streamId":1}'])
  })

  it('reads several lines from one chunk and keeps the unfinished tail', () => {
    const { lines, reader: lineReader } = reader()
    lineReader.push('{"a":1}\n{"b":2}\r\n\n{"c"')
    expect(lines).toEqual(['{"a":1}', '{"b":2}'])
    lineReader.push(':3}\n')
    expect(lines).toEqual(['{"a":1}', '{"b":2}', '{"c":3}'])
  })
})

describe('parseSidecarEvent', () => {
  it('reads an event', () => {
    expect(parseSidecarEvent('{"type":"stopped","streamId":2}')).toEqual({
      type: 'stopped',
      streamId: 2
    })
  })

  it('returns null for invalid JSON, so the line is logged and ignored', () => {
    expect(parseSidecarEvent("thread 'main' panicked at src/main.rs:12")).toBeNull()
    expect(parseSidecarEvent('{"type":')).toBeNull()
  })

  it('returns null for JSON that is not an event', () => {
    expect(parseSidecarEvent('[1,2]')).toBeNull()
    expect(parseSidecarEvent('null')).toBeNull()
    expect(parseSidecarEvent('{"cmd":"list"}')).toBeNull()
  })
})
