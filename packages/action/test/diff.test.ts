import { describe, expect, it, vi } from 'vitest'
import { getChangedFiles } from '../src/diff.js'

interface ListFilesParams {
  owner: string
  repo: string
  pull_number: number
  per_page: number
  page: number
}

interface ListFilesResult {
  data: Array<{ filename: string, additions: number, deletions: number }>
}

interface MockOctokit {
  rest: {
    pulls: {
      listFiles: ReturnType<typeof vi.fn<(params: ListFilesParams) => Promise<ListFilesResult>>>
    }
  }
}

function makeFile(name: string) {
  return { filename: name, additions: 1, deletions: 0, status: 'modified', sha: 'abc' }
}

function buildOctokit(pages: Record<number, ReturnType<typeof makeFile>[]>): MockOctokit {
  return {
    rest: {
      pulls: {
        listFiles: vi.fn(async ({ page }: { page: number }) => ({
          data: pages[page] ?? [],
        })),
      },
    },
  }
}

describe('getChangedFiles pagination', () => {
  it('returns files from a single page with fewer than 100 files', async () => {
    const octokit = buildOctokit({
      1: [makeFile('a.ts'), makeFile('b.ts')],
    })

    const files = await getChangedFiles(octokit, 'owner', 'repo', 1)

    expect(files).toHaveLength(2)
    expect(files[0].filename).toBe('a.ts')
    expect(files[1].filename).toBe('b.ts')
    expect(octokit.rest.pulls.listFiles).toHaveBeenCalledTimes(1)
  })

  it('handles exactly 100 files followed by an empty page', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeFile(`file-${i}.ts`))
    const octokit = buildOctokit({ 1: page1, 2: [] })

    const files = await getChangedFiles(octokit, 'owner', 'repo', 1)

    expect(files).toHaveLength(100)
    expect(octokit.rest.pulls.listFiles).toHaveBeenCalledTimes(2)
  })

  it('paginates across multiple pages', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeFile(`p1-${i}.ts`))
    const page2 = [makeFile('p2-0.ts'), makeFile('p2-1.ts')]
    const octokit = buildOctokit({ 1: page1, 2: page2 })

    const files = await getChangedFiles(octokit, 'owner', 'repo', 1)

    expect(files).toHaveLength(102)
    expect(files[100].filename).toBe('p2-0.ts')
    expect(octokit.rest.pulls.listFiles).toHaveBeenCalledTimes(2)
  })

  it('returns empty array when first page is empty', async () => {
    const octokit = buildOctokit({ 1: [] })

    const files = await getChangedFiles(octokit, 'owner', 'repo', 1)

    expect(files).toHaveLength(0)
    expect(octokit.rest.pulls.listFiles).toHaveBeenCalledTimes(1)
  })

  it('maps additions and deletions correctly', async () => {
    const octokit = buildOctokit({
      1: [{ filename: 'x.ts', additions: 42, deletions: 7, status: 'modified', sha: 'abc' }],
    })

    const files = await getChangedFiles(octokit, 'owner', 'repo', 1)

    expect(files[0]).toEqual({ filename: 'x.ts', additions: 42, deletions: 7 })
  })
})
