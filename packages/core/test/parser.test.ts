import { describe, expect, it } from 'vitest'
import { parse } from '../src/parser.js'

describe('parse', () => {
  it('parses plain patterns as confirm', () => {
    const rs = parse('core/\nsrc/config.ts')
    expect(rs.rules).toEqual([
      { pattern: 'core/', level: 'confirm' },
      { pattern: 'src/config.ts', level: 'confirm' },
    ])
  })

  it('parses ! prefixed patterns as readonly', () => {
    const rs = parse('!LICENSE\n!NOTICE')
    expect(rs.rules).toEqual([
      { pattern: 'LICENSE', level: 'readonly' },
      { pattern: 'NOTICE', level: 'readonly' },
    ])
  })

  it('ignores blank lines and comments', () => {
    const rs = parse('# This is a comment\n\ncore/\n\n# Another comment\n!LICENSE')
    expect(rs.rules).toHaveLength(2)
    expect(rs.rules[0]).toEqual({ pattern: 'core/', level: 'confirm' })
    expect(rs.rules[1]).toEqual({ pattern: 'LICENSE', level: 'readonly' })
  })

  it('handles empty content', () => {
    const rs = parse('')
    expect(rs.rules).toHaveLength(0)
  })

  it('handles content with only comments', () => {
    const rs = parse('# just comments\n# nothing else')
    expect(rs.rules).toHaveLength(0)
  })

  it('trims whitespace from lines', () => {
    const rs = parse('  core/  \n  !LICENSE  ')
    expect(rs.rules).toEqual([
      { pattern: 'core/', level: 'confirm' },
      { pattern: 'LICENSE', level: 'readonly' },
    ])
  })

  it('ignores a bare ! with no pattern', () => {
    const rs = parse('!\ncore/')
    expect(rs.rules).toEqual([{ pattern: 'core/', level: 'confirm' }])
  })

  it('sets the directory field', () => {
    const rs = parse('core/', 'packages/core')
    expect(rs.directory).toBe('packages/core')
  })

  it('defaults directory to empty string', () => {
    const rs = parse('core/')
    expect(rs.directory).toBe('')
  })

  it('handles glob patterns', () => {
    const rs = parse('*.ts\n**/*.test.ts\n!src/**/*.config.ts')
    expect(rs.rules).toEqual([
      { pattern: '*.ts', level: 'confirm' },
      { pattern: '**/*.test.ts', level: 'confirm' },
      { pattern: 'src/**/*.config.ts', level: 'readonly' },
    ])
  })
})
