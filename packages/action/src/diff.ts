import type { ChangedFile } from './types'

interface PullFile {
  filename: string
  additions: number
  deletions: number
}

interface PullListFilesClient {
  rest: {
    pulls: {
      listFiles: (params: {
        owner: string
        repo: string
        pull_number: number
        per_page: number
        page: number
      }) => Promise<{ data: PullFile[] }>
    }
  }
}

/**
 * Fetch the list of files changed in a pull request using the GitHub API.
 * Handles pagination for PRs with many changed files.
 */
export async function getChangedFiles(
  octokit: PullListFilesClient,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<ChangedFile[]> {
  const files: ChangedFile[] = []
  let page = 1

  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    })

    if (data.length === 0)
      break

    for (const file of data) {
      files.push({
        filename: file.filename,
        additions: file.additions,
        deletions: file.deletions,
      })
    }

    if (data.length < 100)
      break
    page++
  }

  return files
}
