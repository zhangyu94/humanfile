import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { classifyAll } from '../src/loader.js'

const FIXTURES_ROOT = join(process.cwd(), 'test/fixtures/classify-all')

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })),
  )
})

async function copyFixture(name: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), `humanfile-${name}-`))
  const target = join(tempDir, 'repo')
  await cp(join(FIXTURES_ROOT, name), target, { recursive: true })
  tempDirs.push(tempDir)
  return target
}

describe('classifyAll integration', () => {
  it('classifies files from a single root .human file', async () => {
    const repoRoot = await copyFixture('basic')
    const result = await classifyAll(repoRoot)

    expect(result.get('src/index.ts')).toBe('confirm')
    expect(result.get('docs/specs/guide.md')).toBe('confirm')
    expect(result.get('package.json')).toBe('free')
  })

  it('applies nested .human files and last-match-wins overrides', async () => {
    const repoRoot = await copyFixture('nested')
    const result = await classifyAll(repoRoot)

    expect(result.get('src/utils/other.ts')).toBe('readonly')
    expect(result.get('src/utils/generated/file.ts')).toBe('confirm')
  })

  it('respects root .gitignore and excludes ignored paths', async () => {
    const repoRoot = await copyFixture('gitignore')
    const result = await classifyAll(repoRoot)

    expect(result.has('src/index.ts')).toBe(true)
    expect(result.get('src/index.ts')).toBe('confirm')
    expect(result.has('dist/bundle.js')).toBe(false)
  })

  it('handles comments and whitespace in real fixture files', async () => {
    const repoRoot = await copyFixture('whitespace')
    const result = await classifyAll(repoRoot)

    expect(result.get('docs/specs/notes.md')).toBe('confirm')
  })
})
