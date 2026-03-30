import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const core = {
    getInput: vi.fn<(name: string) => string>(),
    info: vi.fn<(message: string) => void>(),
    warning: vi.fn<(message: string) => void>(),
    setFailed: vi.fn<(message: string) => void>(),
  }

  const context: {
    repo: { owner: string, repo: string }
    payload: { pull_request?: { number: number } }
  } = {
    repo: { owner: 'octo', repo: 'humanfile' },
    payload: { pull_request: { number: 12 } },
  }

  const github = {
    context,
    getOctokit: vi.fn(),
  }

  return { core, github }
})

vi.mock('@actions/core', () => mocks.core)
vi.mock('@actions/github', () => mocks.github)

interface MockFile {
  filename: string
  additions: number
  deletions: number
}

function buildOctokit(files: MockFile[], existingCommentId?: number, existingCommentPage = 1) {
  const createComment = vi.fn()
  const updateComment = vi.fn()
  const deleteComment = vi.fn()

  return {
    rest: {
      pulls: {
        listFiles: vi.fn(async ({ page }: { page: number }) => {
          if (page > 1)
            return { data: [] }
          return { data: files }
        }),
        listCommits: vi.fn(async () => ({
          data: [{ commit: { message: 'test commit' } }],
        })),
      },
      issues: {
        listComments: vi.fn(async ({ page }: { page?: number }) => ({
          data: existingCommentId && (page ?? 1) === existingCommentPage
            ? [{ id: existingCommentId, body: '<!-- humanfile-action -->\nold' }]
            : [],
        })),
        createComment,
        updateComment,
        deleteComment,
      },
    },
  }
}

const tempDirs: string[] = []

async function createWorkspace(humanRules: string): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), 'humanfile-action-e2e-'))
  tempDirs.push(base)
  await mkdir(join(base, 'docs'), { recursive: true })
  await mkdir(join(base, 'src'), { recursive: true })
  await writeFile(join(base, '.human'), humanRules, 'utf8')
  await writeFile(join(base, 'LICENSE'), 'MIT\n', 'utf8')
  await writeFile(join(base, 'docs', 'guide.md'), 'guide\n', 'utf8')
  await writeFile(join(base, 'src', 'index.ts'), 'export const n = 1;\n', 'utf8')
  return base
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  mocks.core.getInput.mockImplementation((name: string) => {
    const map: Record<string, string> = {
      'github-token': 'test-token',
      'ai-threshold': '1000',
      'fail-on-readonly': 'true',
      'comment-on-pr': 'true',
    }
    return map[name] ?? ''
  })

  mocks.github.context.payload = { pull_request: { number: 12 } }
  process.env.HUMANFILE_ACTION_DISABLE_AUTORUN = '1'
})

afterEach(async () => {
  delete process.env.HUMANFILE_ACTION_DISABLE_AUTORUN
  delete process.env.GITHUB_WORKSPACE

  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })),
  )
})

describe('action e2e', () => {
  it('skips when event is not a pull request', async () => {
    mocks.github.context.payload = {}

    const { run } = await import('../src/main.js')
    await run()

    expect(mocks.core.info).toHaveBeenCalledWith('Not a pull request event — skipping.')
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('skips when no .human files found', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'humanfile-action-e2e-'))
    tempDirs.push(dir)
    process.env.GITHUB_WORKSPACE = dir

    const octokit = buildOctokit([])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(mocks.core.info).toHaveBeenCalledWith('No .human files found — skipping.')
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('skips commenting when no protected files are modified', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit([
      { filename: 'src/index.ts', additions: 5, deletions: 1 },
    ])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled()
    expect(octokit.rest.issues.updateComment).not.toHaveBeenCalled()
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('posts a comment and fails when readonly files are modified', async () => {
    const workspace = await createWorkspace('!LICENSE\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit([
      { filename: 'LICENSE', additions: 8, deletions: 3 },
    ])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1)
    expect(mocks.core.setFailed).toHaveBeenCalledTimes(1)
  })

  it('updates an existing action comment idempotently', async () => {
    const workspace = await createWorkspace('src/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit(
      [{ filename: 'src/index.ts', additions: 12, deletions: 2 }],
      99,
    )
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.updateComment).toHaveBeenCalledTimes(1)
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled()
  })

  it('finds existing marker comments on later pagination pages', async () => {
    const workspace = await createWorkspace('src/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const firstPageComments = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      body: 'non-humanfile comment',
    }))

    const octokit = buildOctokit(
      [{ filename: 'src/index.ts', additions: 12, deletions: 2 }],
      999,
      2,
    )
    octokit.rest.issues.listComments = vi.fn(async ({ page }: { page?: number }) => {
      if ((page ?? 1) === 1)
        return { data: firstPageComments }
      if ((page ?? 1) === 2)
        return { data: [{ id: 999, body: '<!-- humanfile-action -->\nold' }] }
      return { data: [] }
    })
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.listComments).toHaveBeenCalledTimes(2)
    expect(octokit.rest.issues.updateComment).toHaveBeenCalledTimes(1)
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled()
  })

  it('posts comment but does NOT fail for confirm-only violations', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit([
      { filename: 'docs/specs/guide.md', additions: 3, deletions: 1 },
    ])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1)
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('flags AI signal from commit messages when above half-threshold', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit([
      { filename: 'docs/specs/guide.md', additions: 300, deletions: 300 },
    ])
    octokit.rest.pulls.listCommits = vi.fn(async () => ({
      data: [{ commit: { message: 'Generated by Copilot' } }],
    }))
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    const body = octokit.rest.issues.createComment.mock.calls[0][0].body
    expect(body).toContain('AI-generated')
  })

  it('deletes existing comment when violations clear', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit(
      [{ filename: 'src/index.ts', additions: 5, deletions: 1 }],
      42,
    )
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.deleteComment).toHaveBeenCalledWith({
      owner: 'octo',
      repo: 'humanfile',
      comment_id: 42,
    })
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled()
  })

  it('posts comment but does not fail when fail-on-readonly is false and readonly violated', async () => {
    const workspace = await createWorkspace('!LICENSE\n')
    process.env.GITHUB_WORKSPACE = workspace

    mocks.core.getInput.mockImplementation((name: string) => {
      const map: Record<string, string> = {
        'github-token': 'test-token',
        'ai-threshold': '1000',
        'fail-on-readonly': 'false',
        'comment-on-pr': 'true',
      }
      return map[name] ?? ''
    })

    const octokit = buildOctokit([
      { filename: 'LICENSE', additions: 2, deletions: 1 },
    ])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1)
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('does not call PR comment APIs when comment-on-pr is false', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    mocks.core.getInput.mockImplementation((name: string) => {
      const map: Record<string, string> = {
        'github-token': 'test-token',
        'ai-threshold': '1000',
        'fail-on-readonly': 'false',
        'comment-on-pr': 'false',
      }
      return map[name] ?? ''
    })

    const octokit = buildOctokit([
      { filename: 'docs/specs/guide.md', additions: 3, deletions: 1 },
    ])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.listComments).not.toHaveBeenCalled()
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled()
    expect(octokit.rest.issues.updateComment).not.toHaveBeenCalled()
    expect(octokit.rest.issues.deleteComment).not.toHaveBeenCalled()
    expect(mocks.core.info).toHaveBeenCalledWith(
      expect.stringContaining('comment-on-pr is false'),
    )
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it.each([
    'not-a-number',
    '0',
    '-3',
    '',
    '   ',
  ])('fails early when ai-threshold is invalid: %j', async (threshold) => {
    mocks.core.getInput.mockImplementation((name: string) => {
      const map: Record<string, string> = {
        'github-token': 'test-token',
        'ai-threshold': threshold,
        'fail-on-readonly': 'true',
        'comment-on-pr': 'true',
      }
      return map[name] ?? ''
    })

    const { run } = await import('../src/main.js')
    await run()

    expect(mocks.core.setFailed).toHaveBeenCalledTimes(1)
    expect(mocks.core.setFailed.mock.calls[0][0]).toContain('Invalid ai-threshold')
    expect(mocks.github.getOctokit).not.toHaveBeenCalled()
  })

  it('accepts ai-threshold = 1 and continues normally', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    mocks.core.getInput.mockImplementation((name: string) => {
      const map: Record<string, string> = {
        'github-token': 'test-token',
        'ai-threshold': '1',
        'fail-on-readonly': 'true',
        'comment-on-pr': 'true',
      }
      return map[name] ?? ''
    })

    const octokit = buildOctokit([
      { filename: 'docs/specs/guide.md', additions: 1, deletions: 0 },
    ])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1)
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('emits warning and continues when commit fetch fails', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit([
      { filename: 'docs/specs/guide.md', additions: 3, deletions: 1 },
    ])
    octokit.rest.pulls.listCommits = vi.fn(async () => {
      throw new Error('API rate limit exceeded')
    })
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(mocks.core.warning).toHaveBeenCalledTimes(1)
    expect(mocks.core.warning.mock.calls[0][0]).toContain('Failed to fetch commit messages')
    expect(mocks.core.warning.mock.calls[0][0]).toContain('API rate limit exceeded')
    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1)
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('fails when GITHUB_WORKSPACE points to nonexistent path', async () => {
    process.env.GITHUB_WORKSPACE = '/tmp/does-not-exist-humanfile-test'

    const octokit = buildOctokit([])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(mocks.core.setFailed).toHaveBeenCalledTimes(1)
    expect(mocks.core.setFailed.mock.calls[0][0]).toContain('does not exist')
    expect(mocks.core.setFailed.mock.calls[0][0]).toContain('checkout')
  })

  it('warns and falls back to cwd when GITHUB_WORKSPACE is unset', async () => {
    delete process.env.GITHUB_WORKSPACE

    const octokit = buildOctokit([
      { filename: 'src/index.ts', additions: 1, deletions: 0 },
    ])
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(mocks.core.warning).toHaveBeenCalledWith(
      expect.stringContaining('GITHUB_WORKSPACE is not set'),
    )
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  it('passes commit messages to single evaluateProtectedChangeSet call', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit([
      { filename: 'docs/specs/guide.md', additions: 300, deletions: 300 },
    ])
    octokit.rest.pulls.listCommits = vi.fn(async () => ({
      data: [{ commit: { message: 'Generated by Copilot' } }],
    }))
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(octokit.rest.pulls.listCommits).toHaveBeenCalledTimes(1)
    const body = octokit.rest.issues.createComment.mock.calls[0][0].body
    expect(body).toContain('AI-generated')
  })

  it('sets failed status when non-Error value is thrown', async () => {
    const workspace = await createWorkspace('docs/specs/\n')
    process.env.GITHUB_WORKSPACE = workspace

    const octokit = buildOctokit([
      { filename: 'docs/specs/guide.md', additions: 3, deletions: 1 },
    ])
    octokit.rest.issues.createComment = vi.fn(async () => {
      const nonError: unknown = 'string-failure'
      throw nonError
    })
    mocks.github.getOctokit.mockReturnValue(octokit)

    const { run } = await import('../src/main.js')
    await run()

    expect(mocks.core.setFailed).toHaveBeenCalledWith('string-failure')
  })
})
