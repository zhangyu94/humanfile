import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initCommand } from '../src/cli/init.js'

const tempDirs: string[] = []
let captured: string[]
let originalCwd: string

async function makeTempDir(...files: string[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'hf-init-'))
  tempDirs.push(dir)
  for (const file of files) {
    const full = join(dir, file)
    const parent = full.substring(0, full.lastIndexOf('/'))
    const { mkdir } = await import('node:fs/promises')
    await mkdir(parent, { recursive: true })
    await writeFile(full, '', 'utf-8')
  }
  return dir
}

function stdoutText(): string {
  return captured.join('\n')
}

beforeEach(() => {
  captured = []
  originalCwd = process.cwd()
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    captured.push(args.map(String).join(' '))
  })
})

afterEach(async () => {
  process.chdir(originalCwd)
  vi.restoreAllMocks()
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })),
  )
})

async function runInit(args: { force?: boolean }, cwd: string) {
  process.chdir(cwd)
  await (initCommand as any).run({ args: { force: false, ...args } })
}

describe('init command', () => {
  it('creates .human with README.md as confirm when present', async () => {
    const cwd = await makeTempDir('README.md', 'LICENSE')
    await runInit({}, cwd)

    const content = await readFile(join(cwd, '.human'), 'utf-8')
    expect(content).toContain('README.md')
    expect(content).toContain('!LICENSE')
    expect(content).not.toContain('!README.md')
    expect(stdoutText()).toContain('Created .human')
  })

  it('includes docs/specs/ pattern when docs directory exists', async () => {
    const cwd = await makeTempDir('docs/guide.md')
    await runInit({}, cwd)

    const content = await readFile(join(cwd, '.human'), 'utf-8')
    expect(content).toContain('docs/specs/')
  })

  it('skips when .human exists and force is false', async () => {
    const cwd = await makeTempDir()
    await writeFile(join(cwd, '.human'), 'existing\n', 'utf-8')
    await runInit({ force: false }, cwd)

    const content = await readFile(join(cwd, '.human'), 'utf-8')
    expect(content).toBe('existing\n')
    expect(stdoutText()).toContain('already exists')
  })

  it('overwrites when .human exists and force is true', async () => {
    const cwd = await makeTempDir('README.md')
    await writeFile(join(cwd, '.human'), 'old\n', 'utf-8')
    await runInit({ force: true }, cwd)

    const content = await readFile(join(cwd, '.human'), 'utf-8')
    expect(content).not.toBe('old\n')
    expect(content).toContain('README.md')
  })
})
