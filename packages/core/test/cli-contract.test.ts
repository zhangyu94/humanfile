/**
 * CLI contract tests mapped to docs/specs/cli-spec.md.
 *
 * Each describe group references the spec section it validates.
 * Tests invoke command run() directly with controlled args and cwd,
 * capturing stdout and exitCode.
 */
import { Buffer } from 'node:buffer'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkCommand } from '../src/cli/check.js'
import { explainCommand } from '../src/cli/explain.js'

const FIXTURE_ROOT = resolve(__dirname, 'fixtures/cli-contract')

const tempDirs: string[] = []
let captured: string[]
let originalCwd: string
let originalExitCode: typeof process.exitCode

async function makeWorkspace(overrideHumanContent?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'hf-contract-'))
  tempDirs.push(dir)
  await cp(FIXTURE_ROOT, dir, { recursive: true })
  if (overrideHumanContent !== undefined) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(dir, '.human'), overrideHumanContent, 'utf8')
  }
  return dir
}

async function makeEmptyWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'hf-contract-empty-'))
  tempDirs.push(dir)
  return dir
}

function stdoutText(): string {
  return captured.join('\n')
}

beforeEach(() => {
  captured = []
  originalCwd = process.cwd()
  originalExitCode = process.exitCode
  process.exitCode = undefined
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    captured.push(args.map(String).join(' '))
  })
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    captured.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString())
    return true
  })
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = originalExitCode
  vi.restoreAllMocks()
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })),
  )
})

// Spec: check
describe('check command (cli-spec.md §check)', () => {
  async function runCheck(args: Record<string, unknown>, cwd: string) {
    process.chdir(cwd)
    await (checkCommand as any).run({ args })
  }

  it('single-path classification returns level text', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'docs/specs/guide.md', 'json': false, 'exit-code': false, 'explain': false }, cwd)
    expect(stdoutText()).toContain('confirm')
  })

  it('single-path --json returns JSON with path and level', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'docs/specs/guide.md', 'json': true, 'exit-code': false, 'explain': false }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed).toEqual({ path: 'docs/specs/guide.md', level: 'confirm' })
  })

  it('readonly file classified correctly', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'LICENSE', 'json': true, 'exit-code': false, 'explain': false }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed.level).toBe('readonly')
  })

  it('unmatched file is free', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'src/index.ts', 'json': true, 'exit-code': false, 'explain': false }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed.level).toBe('free')
  })

  // Spec: --json returns {"error":...} when no .human
  it('json mode returns error object when no .human files', async () => {
    const cwd = await makeEmptyWorkspace()
    await runCheck({ 'json': true, 'exit-code': false, 'explain': false }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed.error).toBe('No .human files found')
  })

  // Spec: text mode prints guidance to run humanfile init
  it('text mode prints init guidance when no .human files', async () => {
    const cwd = await makeEmptyWorkspace()
    await runCheck({ 'json': false, 'exit-code': false, 'explain': false }, cwd)
    expect(stdoutText()).toContain('humanfile init')
  })

  it('single path in empty tree returns no .human error in json', async () => {
    const cwd = await makeEmptyWorkspace()
    await runCheck({ 'path': 'foo.ts', 'json': true, 'exit-code': false, 'explain': false }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed.error).toBe('No .human files found')
  })

  it('single path in empty tree prints init guidance in text', async () => {
    const cwd = await makeEmptyWorkspace()
    await runCheck({ 'path': 'foo.ts', 'json': false, 'exit-code': false, 'explain': false }, cwd)
    expect(stdoutText()).toContain('humanfile init')
  })

  // Spec: --level filters repo-wide result set
  it('--level readonly filters output to only readonly entries', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'json': true, 'level': 'readonly', 'exit-code': false, 'explain': false }, cwd)
    const parsed = JSON.parse(stdoutText())
    const levels = new Set(Object.values(parsed))
    expect(levels.size).toBeGreaterThan(0)
    expect([...levels]).toEqual(['readonly'])
  })

  it('--level confirm excludes readonly and free', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'json': true, 'level': 'confirm', 'exit-code': false, 'explain': false }, cwd)
    const parsed = JSON.parse(stdoutText())
    for (const level of Object.values(parsed)) {
      expect(level).toBe('confirm')
    }
  })

  it('--level with unknown value sets exitCode 1 and prints error', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'json': false, 'level': 'bogus', 'exit-code': false, 'explain': false }, cwd)
    expect(process.exitCode).toBe(1)
    expect(stdoutText()).toContain('Unknown level')
  })

  it('--level with unknown value rejects even with single path', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'docs/specs/guide.md', 'json': false, 'level': 'bogus', 'exit-code': false, 'explain': false }, cwd)
    expect(process.exitCode).toBe(1)
    expect(stdoutText()).toContain('Unknown level')
  })

  // Spec: repo-wide ordering is readonly > confirm > free
  it('repo-wide text output is ordered readonly, confirm, free', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'json': false, 'exit-code': false, 'explain': false }, cwd)

    const text = stdoutText()
    const levelLines = text.split('\n').filter(l => l.trim().length > 0)
    const levels: string[] = []
    for (const line of levelLines) {
      if (line.includes('readonly') && !line.includes('files'))
        levels.push('readonly')
      else if (line.includes('confirm') && !line.includes('files'))
        levels.push('confirm')
      else if (line.includes('free') && !line.includes('files'))
        levels.push('free')
    }

    const priority: Record<string, number> = { readonly: 0, confirm: 1, free: 2 }
    for (let i = 1; i < levels.length; i++) {
      expect(priority[levels[i]]).toBeGreaterThanOrEqual(priority[levels[i - 1]])
    }
  })

  // Spec: --exit-code returns non-zero when protected files present
  it('--exit-code sets exitCode 1 when protected files in visible set', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'json': false, 'exit-code': true, 'explain': false }, cwd)
    expect(process.exitCode).toBe(1)
  })

  it('--exit-code remains 0 when filtered set has no protected files', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'json': false, 'level': 'free', 'exit-code': true, 'explain': false }, cwd)
    expect(process.exitCode).toBeUndefined()
  })

  // Spec: --explain requires a single path
  it('--explain without path sets exitCode 1', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'json': false, 'exit-code': false, 'explain': true }, cwd)
    expect(process.exitCode).toBe(1)
    expect(stdoutText()).toContain('--explain requires')
  })

  it('--explain for free path shows "no matching .human rule"', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'src/index.ts', 'json': false, 'exit-code': false, 'explain': true }, cwd)
    expect(stdoutText()).toContain('free')
    expect(stdoutText()).toContain('no matching .human rule')
  })

  // Spec: --explain with path shows decisive rule info
  it('--explain with path prints classification provenance', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'docs/specs/guide.md', 'json': false, 'exit-code': false, 'explain': true }, cwd)
    expect(stdoutText()).toContain('confirm')
    expect(stdoutText()).toContain('docs/')
  })

  it('--explain --json for free path returns matched false and no decisiveRule', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'src/index.ts', 'json': true, 'exit-code': false, 'explain': true }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed.level).toBe('free')
    expect(parsed.matched).toBe(false)
    expect(parsed.decisiveRule).toBeNull()
  })

  it('--explain --json returns structured result', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'docs/specs/guide.md', 'json': true, 'exit-code': false, 'explain': true }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed.level).toBe('confirm')
    expect(parsed.path).toBe('docs/specs/guide.md')
    expect(parsed.decisiveRule).toBeDefined()
  })

  it('--exit-code with single readonly path sets exitCode 1', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'LICENSE', 'json': false, 'exit-code': true, 'explain': false }, cwd)
    expect(process.exitCode).toBe(1)
  })

  it('--exit-code with single free path leaves exitCode unset', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'src/index.ts', 'json': false, 'exit-code': true, 'explain': false }, cwd)
    expect(process.exitCode).toBeUndefined()
  })

  it('--explain --exit-code sets exitCode 1 for confirm-level path', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'docs/specs/guide.md', 'json': false, 'exit-code': true, 'explain': true }, cwd)
    expect(process.exitCode).toBe(1)
    expect(stdoutText()).toContain('confirm')
    expect(stdoutText()).toContain('decisive rule:')
  })

  it('--explain --exit-code leaves exitCode unset for free path', async () => {
    const cwd = await makeWorkspace()
    await runCheck({ 'path': 'src/index.ts', 'json': false, 'exit-code': true, 'explain': true }, cwd)
    expect(process.exitCode).toBeUndefined()
  })
})

// Spec: explain
describe('explain command (cli-spec.md §explain)', () => {
  async function runExplain(args: Record<string, unknown>, cwd: string) {
    process.chdir(cwd)
    await (explainCommand as any).run({ args })
  }

  it('explains a matched path with decisive rule', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false }, cwd)
    expect(stdoutText()).toContain('confirm')
    expect(stdoutText()).toContain('docs/')
  })

  // Spec: no paths → non-zero
  it('exits non-zero when no paths are provided', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'json': false, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false }, cwd)
    expect(process.exitCode).toBe(1)
  })

  // Spec: --quiet cannot be combined with --json
  it('--quiet --json conflict sets exitCode 1', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': true, 'verbose': false, 'quiet': true, 'non-matching': false, 'z': false, 'stdin': false }, cwd)
    expect(process.exitCode).toBe(1)
    expect(stdoutText()).toContain('Cannot combine')
  })

  // Spec: -z cannot be combined with --verbose
  it('-z --verbose conflict sets exitCode 1', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': true, 'quiet': false, 'non-matching': false, 'z': true, 'stdin': false }, cwd)
    expect(process.exitCode).toBe(1)
    expect(stdoutText()).toContain('Cannot combine')
  })

  // Spec: default only shows matched paths
  it('default mode omits unmatched (free) paths', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'src/index.ts', 'json': false, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(process.exitCode).toBe(1)
  })

  // Spec: --non-matching includes free records
  it('--non-matching includes free paths in output', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'src/index.ts', 'json': false, 'verbose': false, 'quiet': false, 'non-matching': true, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(stdoutText()).toContain('src/index.ts')
    expect(stdoutText()).toContain('free')
  })

  // Spec: --quiet exits non-zero if any input path has no decisive rule match
  it('--quiet does not set exitCode when all paths have decisive rules', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': false, 'quiet': true, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(process.exitCode).toBeUndefined()
    expect(stdoutText().trim()).toBe('')
  })

  it('--quiet sets exitCode 1 when a path has no decisive rule', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'src/index.ts', 'json': false, 'verbose': false, 'quiet': true, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(process.exitCode).toBe(1)
  })

  it('--quiet --non-matching does not fail on unmatched paths', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'src/index.ts', 'json': false, 'verbose': false, 'quiet': true, 'non-matching': true, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(process.exitCode).toBeUndefined()
  })

  it('--json returns empty array and exitCode 1 when all paths unmatched without --non-matching', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'src/index.ts', 'json': true, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed).toEqual([])
    expect(process.exitCode).toBe(1)
  })

  // Spec: --json structured output
  it('--json returns structured explanation', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': true, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(parsed.path).toBe('docs/specs/guide.md')
    expect(parsed.level).toBe('confirm')
    expect(parsed.decisiveRule).toBeDefined()
    expect(parsed.trace).toBeInstanceOf(Array)
  })

  it('--json with multiple paths returns array', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': true, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false, '_': ['LICENSE'] }, cwd)
    const parsed = JSON.parse(stdoutText())
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(2)
  })

  // Spec: --verbose includes rule-by-rule trace
  it('--verbose shows rule-by-rule trace', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': true, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(stdoutText()).toContain('trace:')
    expect(stdoutText()).toContain('decisive rule:')
  })

  // Spec: -z mode produces NUL-delimited records with TAB fields
  it('-z outputs NUL-delimited TAB-separated records', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': true, 'stdin': false, '_': ['LICENSE'] }, cwd)
    const raw = stdoutText()
    const records = raw.split('\0').filter(r => r.length > 0)
    expect(records).toHaveLength(2)
    for (const record of records) {
      const fields = record.split('\t')
      expect(fields).toHaveLength(4)
    }
  })

  it('-z record fields are path, level, sourceFile, pattern', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': true, 'stdin': false, '_': [] }, cwd)
    const raw = stdoutText()
    const records = raw.split('\0').filter(r => r.length > 0)
    const fields = records[0].split('\t')
    expect(fields[0]).toBe('docs/specs/guide.md')
    expect(fields[1]).toBe('confirm')
    expect(fields[2]).toContain('.human')
    expect(fields[3]).toBe('docs/specs/')
  })

  // Spec: -n alias for --non-matching
  it('-n alias works like --non-matching', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'src/index.ts', 'json': false, 'verbose': false, 'quiet': false, 'non-matching': false, 'n': true, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(stdoutText()).toContain('src/index.ts')
  })

  // Spec: -q alias for --quiet
  it('-q alias works like --quiet', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': false, 'quiet': false, 'q': true, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(process.exitCode).toBeUndefined()
    expect(stdoutText().trim()).toBe('')
  })

  // Spec: -v alias for --verbose
  it('-v alias works like --verbose', async () => {
    const cwd = await makeWorkspace()
    await runExplain({ 'path': 'docs/specs/guide.md', 'json': false, 'verbose': false, 'v': true, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': false, '_': [] }, cwd)
    expect(stdoutText()).toContain('trace:')
  })

  // Spec: --stdin reads paths from stdin
  describe('--stdin', () => {
    function mockStdin(content: string) {
      const buf = Buffer.from(content)
      vi.spyOn(process, 'stdin', 'get').mockReturnValue({
        async* [Symbol.asyncIterator]() { yield buf },
      } as any)
    }

    it('reads newline-delimited paths from stdin', async () => {
      const cwd = await makeWorkspace()
      mockStdin('docs/specs/guide.md\nLICENSE\n')
      await runExplain({ 'json': true, 'verbose': false, 'quiet': false, 'non-matching': true, 'z': false, 'stdin': true, '_': [] }, cwd)
      const parsed = JSON.parse(stdoutText())
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].path).toBe('docs/specs/guide.md')
      expect(parsed[1].path).toBe('LICENSE')
    })

    it('handles CRLF line endings in stdin', async () => {
      const cwd = await makeWorkspace()
      mockStdin('docs/specs/guide.md\r\nLICENSE\r\n')
      await runExplain({ 'json': true, 'verbose': false, 'quiet': false, 'non-matching': true, 'z': false, 'stdin': true, '_': [] }, cwd)
      const parsed = JSON.parse(stdoutText())
      expect(parsed).toHaveLength(2)
      expect(parsed[0].path).toBe('docs/specs/guide.md')
    })

    it('-z reads NUL-delimited paths from stdin', async () => {
      const cwd = await makeWorkspace()
      mockStdin('docs/specs/guide.md\0LICENSE\0')
      await runExplain({ 'json': true, 'verbose': false, 'quiet': false, 'non-matching': true, 'z': true, 'stdin': true, '_': [] }, cwd)
      const parsed = JSON.parse(stdoutText())
      expect(parsed).toHaveLength(2)
      expect(parsed[0].path).toBe('docs/specs/guide.md')
      expect(parsed[1].path).toBe('LICENSE')
    })

    it('empty stdin yields no paths and exitCode 1', async () => {
      const cwd = await makeWorkspace()
      mockStdin('')
      await runExplain({ 'json': false, 'verbose': false, 'quiet': false, 'non-matching': false, 'z': false, 'stdin': true, '_': [] }, cwd)
      expect(process.exitCode).toBe(1)
      expect(stdoutText()).toContain('No paths provided')
    })
  })
})
