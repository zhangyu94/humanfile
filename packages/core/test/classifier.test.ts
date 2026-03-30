import { describe, expect, it } from 'vitest'
import { classify } from '../src/classifier.js'
import { parse } from '../src/parser.js'

describe('classify', () => {
  it('returns free for unmatched files', () => {
    const rs = parse('core/')
    expect(classify('src/index.ts', [rs])).toBe('free')
  })

  it('returns confirm for files matching a plain pattern', () => {
    const rs = parse('core/')
    expect(classify('core/main.ts', [rs])).toBe('confirm')
  })

  it('returns readonly for files matching a ! pattern', () => {
    const rs = parse('!LICENSE')
    expect(classify('LICENSE', [rs])).toBe('readonly')
  })

  it('last match wins within a single rule set', () => {
    const content = [
      'src/',
      '!src/',
    ].join('\n')
    const rs = parse(content)
    expect(classify('src/index.ts', [rs])).toBe('readonly')
  })

  it('last match wins — confirm overrides readonly', () => {
    const content = [
      '!src/',
      'src/',
    ].join('\n')
    const rs = parse(content)
    expect(classify('src/index.ts', [rs])).toBe('confirm')
  })

  it('glob patterns work', () => {
    const rs = parse('*.config.ts')
    expect(classify('vitest.config.ts', [rs])).toBe('confirm')
    expect(classify('src/app.ts', [rs])).toBe('free')
  })

  it('double-star patterns match deeply nested files', () => {
    const rs = parse('!src/**/*.test.ts')
    expect(classify('src/utils/helper.test.ts', [rs])).toBe('readonly')
    expect(classify('src/utils/helper.ts', [rs])).toBe('free')
  })

  it('deeper rule set overrides shallower rule set', () => {
    const root = parse('src/', '')
    const nested = parse('!utils/', 'src')
    expect(classify('src/utils/helper.ts', [root, nested])).toBe('readonly')
  })

  it('nested rule set does not affect sibling paths', () => {
    const root = parse('src/', '')
    const nested = parse('!utils/', 'src')
    expect(classify('src/index.ts', [root, nested])).toBe('confirm')
  })

  it('returns free when no rule sets are provided', () => {
    expect(classify('any/file.ts', [])).toBe('free')
  })

  it('handles multiple rule sets ordered root to deep', () => {
    const root = parse('!src/')
    const srcRs = parse('generated/', 'src')
    expect(classify('src/generated/file.ts', [root, srcRs])).toBe('confirm')
    expect(classify('src/index.ts', [root, srcRs])).toBe('readonly')
  })

  it('pattern without leading slash matches at any depth (gitignore semantics)', () => {
    const rs = parse('!LICENSE')
    expect(classify('LICENSE', [rs])).toBe('readonly')
    expect(classify('src/LICENSE', [rs])).toBe('readonly')
  })

  it('pattern with leading slash matches only at root', () => {
    const rs = parse('!/LICENSE')
    expect(classify('LICENSE', [rs])).toBe('readonly')
    expect(classify('src/LICENSE', [rs])).toBe('free')
  })
})
