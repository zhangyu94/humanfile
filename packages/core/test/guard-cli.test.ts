import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildGuardHookScript,
  installGuardHook,
  parseHookTargets,
  readGuardStatus,
  runGuardCheck,
  uninstallGuardHook,
} from '../src/cli/guard.js'

const tempDirs: string[] = []

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'humanfile-guard-test-'))
  tempDirs.push(dir)
  return dir
}

async function initRepo(cwd: string): Promise<void> {
  await runGit(cwd, ['init'])
  await runGit(cwd, ['config', 'user.name', 'Humanfile Bot'])
  await runGit(cwd, ['config', 'user.email', 'humanfile@example.com'])
  await mkdir(join(cwd, '.git', 'hooks'), { recursive: true })
}

async function runGit(cwd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<{ status: number, stdout: string, stderr: string }> {
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync('git', args, {
    cwd,
    env,
    encoding: 'utf8',
  })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('guard helpers', () => {
  it('parses hook targets', () => {
    expect(parseHookTargets('pre-commit')).toEqual(['pre-commit'])
    expect(parseHookTargets('pre-push')).toEqual(['pre-push'])
    expect(parseHookTargets('both')).toEqual(['pre-commit', 'pre-push'])
    expect(() => parseHookTargets('invalid')).toThrow('Unsupported hook')
  })

  it('builds hook script with sentinel and run command', () => {
    const script = buildGuardHookScript('pre-commit', 'staged')
    expect(script).toContain('# humanfile-guard:v1')
    expect(script).toContain('guard run --hook "')
    expect(script).toContain('HUMANFILE_GUARD_BIN')
  })
})

describe('guard hook lifecycle', () => {
  it('installs and reports status for managed hook', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    const install = await installGuardHook({
      cwd: repo,
      hook: 'pre-commit',
      mode: 'staged',
      force: false,
      dryRun: false,
    })

    expect(install.skipped).toBe(false)

    const statuses = await readGuardStatus(repo)
    const preCommit = statuses.find(s => s.hook === 'pre-commit')
    expect(preCommit?.installed).toBe(true)
    expect(preCommit?.managedByHumanfile).toBe(true)
    expect(preCommit?.mode).toBe('staged')
  })

  it('refuses to overwrite custom hook without force', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    const customHookPath = join(repo, '.git', 'hooks', 'pre-commit')
    await writeFile(customHookPath, '#!/usr/bin/env sh\necho custom\n', 'utf8')
    await chmod(customHookPath, 0o755)

    await expect(
      installGuardHook({
        cwd: repo,
        hook: 'pre-commit',
        mode: 'staged',
        force: false,
        dryRun: false,
      }),
    ).rejects.toThrow('Refusing to overwrite existing non-humanfile hook')
  })

  it('uninstall removes only managed hooks', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await installGuardHook({
      cwd: repo,
      hook: 'pre-commit',
      mode: 'staged',
      policy: 'strict',
      force: false,
      dryRun: false,
    })

    const customHookPath = join(repo, '.git', 'hooks', 'pre-push')
    await writeFile(customHookPath, '#!/usr/bin/env sh\necho custom\n', 'utf8')
    await chmod(customHookPath, 0o755)

    const removed = await uninstallGuardHook({ cwd: repo, hook: 'pre-commit', dryRun: false })
    const skipped = await uninstallGuardHook({ cwd: repo, hook: 'pre-push', dryRun: false })

    expect(removed.removed).toBe(true)
    expect(skipped.removed).toBe(false)
    expect(skipped.skippedReason).toBe('non-humanfile')
  })
})

describe('guard check behavior', () => {
  it('detects protected staged files and reports violation', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await writeFile(join(repo, '.human'), 'docs/specs/\n!LICENSE\n', 'utf8')
    await mkdir(join(repo, 'docs', 'specs'), { recursive: true })
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v1\n', 'utf8')
    await writeFile(join(repo, 'src.ts'), 'export const x = 1\n', 'utf8')

    await runGit(repo, ['add', '.'])
    await runGit(repo, ['commit', '-m', 'baseline'])

    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v2\n', 'utf8')
    await runGit(repo, ['add', 'docs/specs/guide.md'])

    const result = await runGuardCheck(repo, 'pre-commit', 'staged')
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].path).toBe('docs/specs/guide.md')
    expect(result.violations[0].level).toBe('confirm')
  })

  it('returns no violation for free-only staged files', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await writeFile(join(repo, '.human'), 'docs/specs/\n', 'utf8')
    await mkdir(join(repo, 'docs', 'specs'), { recursive: true })
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v1\n', 'utf8')
    await writeFile(join(repo, 'src.ts'), 'export const x = 1\n', 'utf8')

    await runGit(repo, ['add', '.'])
    await runGit(repo, ['commit', '-m', 'baseline'])

    await writeFile(join(repo, 'src.ts'), 'export const x = 2\n', 'utf8')
    await runGit(repo, ['add', 'src.ts'])

    const result = await runGuardCheck(repo, 'pre-commit', 'staged')
    expect(result.violations).toHaveLength(0)
  })

  it('installed pre-commit hook blocks commit when protected files are staged', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await writeFile(join(repo, '.human'), 'docs/specs/\n', 'utf8')
    await mkdir(join(repo, 'docs', 'specs'), { recursive: true })
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v1\n', 'utf8')
    await runGit(repo, ['add', '.'])
    await runGit(repo, ['commit', '-m', 'baseline'])

    await installGuardHook({
      cwd: repo,
      hook: 'pre-commit',
      mode: 'staged',
      policy: 'strict',
      force: false,
      dryRun: false,
    })

    const wrapperPath = join(repo, 'humanfile-guard-wrapper.sh')
    const workspaceRoot = resolve(process.cwd(), '..', '..')
    const wrapper = [
      '#!/usr/bin/env sh',
      `cd "${workspaceRoot}"`,
      'pnpm --filter humanfile run humanfile "$@"',
    ].join('\n')
    await writeFile(wrapperPath, wrapper, 'utf8')
    await chmod(wrapperPath, 0o755)

    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v2\n', 'utf8')
    await runGit(repo, ['add', 'docs/specs/guide.md'])

    const commit = await runGit(
      repo,
      ['commit', '-m', 'should fail'],
      { ...process.env, HUMANFILE_GUARD_BIN: wrapperPath },
    )

    expect(commit.status).not.toBe(0)
    expect(`${commit.stdout}${commit.stderr}`).toContain('humanfile guard blocked protected-file changes')
  })

  it('ai-aware mode does not block small protected staged edits', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await writeFile(join(repo, '.human'), 'docs/specs/\n', 'utf8')
    await mkdir(join(repo, 'docs', 'specs'), { recursive: true })
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v1\n', 'utf8')
    await runGit(repo, ['add', '.'])
    await runGit(repo, ['commit', '-m', 'baseline'])

    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v2\n', 'utf8')
    await runGit(repo, ['add', 'docs/specs/guide.md'])

    const result = await runGuardCheck(repo, 'pre-commit', 'staged', 'ai-aware', 1000)
    expect(result.violations).toHaveLength(1)
    expect(result.likelyAiGenerated).toBe(false)
    expect(result.shouldBlock).toBe(false)
  })

  it('ai-aware mode blocks large protected staged edits', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await writeFile(join(repo, '.human'), 'docs/specs/\n', 'utf8')
    await mkdir(join(repo, 'docs', 'specs'), { recursive: true })
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v1\n', 'utf8')
    await runGit(repo, ['add', '.'])
    await runGit(repo, ['commit', '-m', 'baseline'])

    const largeDoc = `${'line\n'.repeat(1200)}`
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), largeDoc, 'utf8')
    await runGit(repo, ['add', 'docs/specs/guide.md'])

    const result = await runGuardCheck(repo, 'pre-commit', 'staged', 'ai-aware', 1000)
    expect(result.violations).toHaveLength(1)
    expect(result.likelyAiGenerated).toBe(true)
    expect(result.shouldBlock).toBe(true)
  })

  it('detects violations in pre-push diff mode', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await writeFile(join(repo, '.human'), 'docs/specs/\n', 'utf8')
    await mkdir(join(repo, 'docs', 'specs'), { recursive: true })
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v1\n', 'utf8')
    await writeFile(join(repo, 'src.ts'), 'export const x = 1\n', 'utf8')

    await runGit(repo, ['add', '.'])
    await runGit(repo, ['commit', '-m', 'baseline'])

    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v2\n', 'utf8')
    await runGit(repo, ['add', 'docs/specs/guide.md'])
    await runGit(repo, ['commit', '-m', 'update docs'])

    const result = await runGuardCheck(repo, 'pre-push', 'diff')
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].path).toBe('docs/specs/guide.md')
    expect(result.violations[0].level).toBe('confirm')
  })

  it('returns no violations when no files changed', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await writeFile(join(repo, '.human'), 'docs/specs/\n', 'utf8')
    await mkdir(join(repo, 'docs', 'specs'), { recursive: true })
    await writeFile(join(repo, 'docs', 'specs', 'guide.md'), 'v1\n', 'utf8')
    await runGit(repo, ['add', '.'])
    await runGit(repo, ['commit', '-m', 'baseline'])

    const result = await runGuardCheck(repo, 'pre-commit', 'staged')
    expect(result.violations).toHaveLength(0)
    expect(result.shouldBlock).toBe(false)
  })
})

describe('guard hook edge cases', () => {
  it('uninstall returns missing when hook file does not exist', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    const result = await uninstallGuardHook({ cwd: repo, hook: 'pre-commit', dryRun: false })
    expect(result.removed).toBe(false)
    expect(result.skippedReason).toBe('missing')
  })

  it('install skips when hook already matches config', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await installGuardHook({ cwd: repo, hook: 'pre-commit', mode: 'staged', force: false, dryRun: false })
    const second = await installGuardHook({ cwd: repo, hook: 'pre-commit', mode: 'staged', force: false, dryRun: false })
    expect(second.skipped).toBe(true)
  })

  it('status reports both hooks when only one is installed', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    await installGuardHook({ cwd: repo, hook: 'pre-commit', mode: 'staged', force: false, dryRun: false })

    const statuses = await readGuardStatus(repo)
    expect(statuses).toHaveLength(2)

    const preCommit = statuses.find(s => s.hook === 'pre-commit')!
    const prePush = statuses.find(s => s.hook === 'pre-push')!

    expect(preCommit.installed).toBe(true)
    expect(preCommit.managedByHumanfile).toBe(true)
    expect(prePush.installed).toBe(false)
    expect(prePush.managedByHumanfile).toBe(false)
  })

  it('install with dryRun does not create hook file', async () => {
    const repo = await makeTempDir()
    await initRepo(repo)

    const result = await installGuardHook({ cwd: repo, hook: 'pre-commit', mode: 'staged', force: false, dryRun: true })
    expect(result.skipped).toBe(false)

    const statuses = await readGuardStatus(repo)
    const preCommit = statuses.find(s => s.hook === 'pre-commit')!
    expect(preCommit.installed).toBe(false)
  })
})
