import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lsCommand } from '../src/cli/ls.js'

const tempDirs: string[] = []
let captured: string[]
let originalCwd: string

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

async function makeWorkspace(humanContent?: string, nestedHuman?: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'hf-ls-'))
  tempDirs.push(dir)
  if (humanContent !== undefined)
    await writeFile(join(dir, '.human'), humanContent, 'utf-8')
  if (nestedHuman) {
    for (const [path, content] of Object.entries(nestedHuman)) {
      await mkdir(join(dir, path.substring(0, path.lastIndexOf('/'))), { recursive: true })
      await writeFile(join(dir, path), content, 'utf-8')
    }
  }
  return dir
}

describe('ls command', () => {
  it('prints no-files message when no .human exists', async () => {
    const cwd = await makeWorkspace()
    process.chdir(cwd)
    await (lsCommand as any).run({ args: {} })
    expect(stdoutText()).toContain('No .human files found')
  })

  it('lists root .human with rule counts', async () => {
    const cwd = await makeWorkspace('docs/\n!LICENSE\n')
    process.chdir(cwd)
    await (lsCommand as any).run({ args: {} })
    const out = stdoutText()
    expect(out).toContain('.human')
    expect(out).toContain('1 confirm')
    expect(out).toContain('1 readonly')
  })

  it('lists nested .human files', async () => {
    const cwd = await makeWorkspace('src/\n', {
      'src/.human': '!generated/\n',
    })
    process.chdir(cwd)
    await (lsCommand as any).run({ args: {} })
    const out = stdoutText()
    expect(out).toContain('.human')
    expect(out).toContain('src/.human')
  })
})
