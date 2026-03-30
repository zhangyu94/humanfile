import { describe, expect, it } from 'vitest'
import { explain } from '../src/classifier.js'
import { parse } from '../src/parser.js'

describe('explain', () => {
  it('returns decisive-rule metadata for matched rules', () => {
    const rules = parse('src/')
    const result = explain('src/index.ts', [rules])

    expect(result.level).toBe('confirm')
    expect(result.matched).toBe(true)
    expect(result.decisiveRule).toEqual({
      sourceFile: '.human',
      sourceDirectory: '',
      pattern: 'src/',
      level: 'confirm',
    })
  })

  it('returns free and null decisiveRule when no rules match', () => {
    const rules = parse('core/')
    const result = explain('src/index.ts', [rules])

    expect(result.level).toBe('free')
    expect(result.matched).toBe(false)
    expect(result.decisiveRule).toBeNull()
    expect(result.trace).toHaveLength(1)
    expect(result.trace[0]).toMatchObject({
      sourceFile: '.human',
      pattern: 'core/',
      matched: false,
      effectiveLevelAfterRule: 'free',
    })
  })

  it('tracks precedence across nested rule sets', () => {
    const root = parse('src/', '')
    const nested = parse('!generated/', 'src')

    const result = explain('src/generated/file.ts', [root, nested])

    expect(result.level).toBe('readonly')
    expect(result.decisiveRule).toEqual({
      sourceFile: 'src/.human',
      sourceDirectory: 'src',
      pattern: 'generated/',
      level: 'readonly',
    })
  })

  it('records effective level after each evaluated rule', () => {
    const rules = parse('src/\n!src/')
    const result = explain('src/index.ts', [rules])

    expect(result.trace).toHaveLength(2)
    expect(result.trace[0].effectiveLevelAfterRule).toBe('confirm')
    expect(result.trace[1].effectiveLevelAfterRule).toBe('readonly')
  })

  it('ignores rule sets outside path scope', () => {
    const root = parse('src/', '')
    const docs = parse('!guide.md', 'docs')

    const result = explain('src/index.ts', [root, docs])

    expect(result.level).toBe('confirm')
    expect(result.trace).toHaveLength(1)
    expect(result.trace[0].sourceFile).toBe('.human')
  })
})
