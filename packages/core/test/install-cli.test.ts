import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildEnvironmentChoices,
  detectEnvironment,
  installConfig,
  installSkillTemplate,
  parseEnvironmentCsv,
  resolveBundledConfigRoot,
} from '../src/cli/install.js'

const tempDirs: string[] = []

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'humanfile-install-test-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('detectEnvironment', () => {
  it('prefers cursor when .cursor directory exists', async () => {
    const cwd = await makeTempDir()
    await mkdir(join(cwd, '.cursor', 'rules'), { recursive: true })
    await mkdir(join(cwd, '.github'), { recursive: true })

    expect(detectEnvironment(cwd)).toBe('cursor')
  })

  it('detects copilot via .vscode directory', async () => {
    const cwd = await makeTempDir()
    await mkdir(join(cwd, '.vscode'), { recursive: true })

    expect(detectEnvironment(cwd)).toBe('copilot')
  })

  it('detects windsurf via .windsurfrules file', async () => {
    const cwd = await makeTempDir()
    await writeFile(join(cwd, '.windsurfrules'), '', 'utf-8')

    expect(detectEnvironment(cwd)).toBe('windsurf')
  })

  it('detects cline via .clinerules file', async () => {
    const cwd = await makeTempDir()
    await writeFile(join(cwd, '.clinerules'), '', 'utf-8')

    expect(detectEnvironment(cwd)).toBe('cline')
  })

  it('detects claude via CLAUDE.md file', async () => {
    const cwd = await makeTempDir()
    await writeFile(join(cwd, 'CLAUDE.md'), '', 'utf-8')

    expect(detectEnvironment(cwd)).toBe('claude')
  })

  it('prefers codex (AGENTS.md) over copilot (.github)', async () => {
    const cwd = await makeTempDir()
    await writeFile(join(cwd, 'AGENTS.md'), '', 'utf-8')
    await mkdir(join(cwd, '.github'), { recursive: true })

    expect(detectEnvironment(cwd)).toBe('codex')
  })

  it('returns null for empty directory', async () => {
    const cwd = await makeTempDir()
    expect(detectEnvironment(cwd)).toBeNull()
  })
})

describe('parseEnvironmentCsv', () => {
  it('parses comma-separated environments', () => {
    expect(parseEnvironmentCsv('copilot, claude')).toEqual(['copilot', 'claude'])
  })

  it('deduplicates repeated values', () => {
    expect(parseEnvironmentCsv('copilot,copilot,claude')).toEqual(['copilot', 'claude'])
  })

  it('throws on unsupported values', () => {
    expect(() => parseEnvironmentCsv('copilot,unknown')).toThrow('Unsupported environment: unknown')
  })
})

describe('buildEnvironmentChoices', () => {
  it('checks only detected environment by default', () => {
    const choices = buildEnvironmentChoices('copilot')
    const checked = choices.filter(choice => choice.checked).map(choice => choice.value)
    expect(checked).toEqual(['copilot'])
  })

  it('checks nothing when environment is not auto-detected', () => {
    const choices = buildEnvironmentChoices(null)
    expect(choices.every(choice => !choice.checked)).toBe(true)
  })
})

describe('resolveBundledConfigRoot', () => {
  it('resolves to existing bundled config directory', () => {
    const root = resolveBundledConfigRoot()
    expect(root).toContain('configs/generated')
  })
})

describe('installConfig', () => {
  it('reads bundled config and writes to environment target path', async () => {
    const cwd = await makeTempDir()
    const bundled = await makeTempDir()
    await mkdir(join(bundled, 'copilot', '.github'), { recursive: true })
    await writeFile(join(bundled, 'copilot', '.github', 'copilot-instructions.md'), '# bundled config\n', 'utf-8')

    const result = await installConfig({
      cwd,
      env: 'copilot',
      force: false,
      dryRun: false,
      bundledRoot: bundled,
    })

    expect(result.skipped).toBe(false)
    expect(result.sourcePath).toContain('copilot-instructions.md')

    const target = join(cwd, '.github', 'copilot-instructions.md')
    const content = await readFile(target, 'utf-8')
    expect(content).toBe('# bundled config\n')
  })

  it('skips overwrite when file exists and force=false', async () => {
    const cwd = await makeTempDir()
    await mkdir(join(cwd, '.github'), { recursive: true })
    await writeFile(join(cwd, '.github', 'copilot-instructions.md'), 'existing\n', 'utf-8')

    const result = await installConfig({
      cwd,
      env: 'copilot',
      force: false,
      dryRun: false,
      bundledRoot: await makeTempDir(),
    })

    expect(result.skipped).toBe(true)
  })

  it('supports dry-run without writing files', async () => {
    const cwd = await makeTempDir()
    const bundled = await makeTempDir()
    await mkdir(join(bundled, 'copilot', '.github'), { recursive: true })
    await writeFile(join(bundled, 'copilot', '.github', 'copilot-instructions.md'), '# bundled config\n', 'utf-8')

    const result = await installConfig({
      cwd,
      env: 'copilot',
      force: false,
      dryRun: true,
      bundledRoot: bundled,
    })

    expect(result.skipped).toBe(false)
    await expect(readFile(join(cwd, '.github', 'copilot-instructions.md'), 'utf-8')).rejects.toThrow()
  })
})

describe('installSkillTemplate', () => {
  it('writes generated skill template to .agents path', async () => {
    const cwd = await makeTempDir()
    const bundled = await makeTempDir()
    await mkdir(join(bundled, 'skills', 'humanfile'), { recursive: true })
    await writeFile(join(bundled, 'skills', 'humanfile', 'SKILL.md'), '# skill\n', 'utf-8')

    const result = await installSkillTemplate({
      cwd,
      force: false,
      dryRun: false,
      bundledRoot: bundled,
    })

    expect(result.skipped).toBe(false)
    const content = await readFile(join(cwd, '.agents', 'skills', 'humanfile', 'SKILL.md'), 'utf-8')
    expect(content).toBe('# skill\n')
  })

  it('supports dry-run without writing files', async () => {
    const cwd = await makeTempDir()
    const bundled = await makeTempDir()
    await mkdir(join(bundled, 'skills', 'humanfile'), { recursive: true })
    await writeFile(join(bundled, 'skills', 'humanfile', 'SKILL.md'), '# skill\n', 'utf-8')

    const result = await installSkillTemplate({
      cwd,
      force: false,
      dryRun: true,
      bundledRoot: bundled,
    })

    expect(result.skipped).toBe(false)
    await expect(readFile(join(cwd, '.agents', 'skills', 'humanfile', 'SKILL.md'), 'utf-8')).rejects.toThrow()
  })
})
