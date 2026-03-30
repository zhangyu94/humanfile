import type { AnalysisResult, Violation } from './types'
import { existsSync } from 'node:fs'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { discoverRuleSets, evaluateProtectedChangeSet } from 'humanfile'
import { buildComment } from './comment'
import { getChangedFiles } from './diff'

const COMMENT_MARKER = '<!-- humanfile-action -->'

function resolveWorkspace(): string | null {
  const envPath = process.env.GITHUB_WORKSPACE
  if (envPath) {
    if (existsSync(envPath))
      return envPath
    core.setFailed(
      `GITHUB_WORKSPACE is set to "${envPath}" but the path does not exist. `
      + 'Ensure the checkout step runs before this action.',
    )
    return null
  }
  core.warning(
    'GITHUB_WORKSPACE is not set. Falling back to process working directory. '
    + 'This is expected in local testing but not in CI.',
  )
  return process.cwd()
}

export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token')
    const aiThreshold = Number(core.getInput('ai-threshold'))
    if (!Number.isFinite(aiThreshold) || aiThreshold <= 0) {
      core.setFailed(`Invalid ai-threshold: expected a positive number, got "${core.getInput('ai-threshold')}"`)
      return
    }
    const failOnReadonly = core.getInput('fail-on-readonly') === 'true'
    const commentOnPr = (core.getInput('comment-on-pr') || 'true') === 'true'

    const octokit = github.getOctokit(token)
    const { owner, repo } = github.context.repo
    const pullNumber = github.context.payload.pull_request?.number

    if (!pullNumber) {
      core.info('Not a pull request event — skipping.')
      return
    }

    const workspace = resolveWorkspace()
    if (!workspace)
      return

    const ruleSets = await discoverRuleSets(workspace)

    if (ruleSets.length === 0) {
      core.info('No .human files found — skipping.')
      return
    }

    const changedFiles = await getChangedFiles(octokit, owner, repo, pullNumber)
    const commitMessages = await getCommitMessages(octokit, owner, repo, pullNumber)

    const evaluation = evaluateProtectedChangeSet({
      changedFiles,
      ruleSets,
      aiThreshold,
      commitMessages,
    })

    const violations: Violation[] = evaluation.violations

    if (violations.length === 0) {
      core.info('No protected files were modified.')
      if (commentOnPr) {
        await deleteExistingComment(octokit, owner, repo, pullNumber)
      }
      return
    }

    const result: AnalysisResult = {
      violations,
      likelyAiGenerated: evaluation.likelyAiGenerated,
      totalLinesChanged: evaluation.totalLinesChanged,
    }

    if (commentOnPr) {
      const body = `${COMMENT_MARKER}\n${buildComment(result)}`
      await upsertComment(octokit, owner, repo, pullNumber, body)
    }
    else {
      core.info('comment-on-pr is false; skipping PR comment and logging violations.')
      logViolations(result)
    }

    const hasReadonly = violations.some(v => v.level === 'readonly')
    if (hasReadonly && failOnReadonly) {
      core.setFailed(
        `Readonly-protected files in .human were modified: ${violations
          .filter(v => v.level === 'readonly')
          .map(v => v.filename)
          .join(', ')}`,
      )
    }
  }
  catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

function logViolations(result: AnalysisResult): void {
  const severity = result.likelyAiGenerated ? 'warning' : 'info'
  core.info(`humanfile result (${severity}): ${result.violations.length} protected file(s), total lines changed=${result.totalLinesChanged}`)
  for (const violation of result.violations) {
    core.info(`- ${violation.level}: ${violation.filename} (+${violation.additions}/-${violation.deletions})`)
  }
}

async function upsertComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
): Promise<void> {
  const existing = await findComment(octokit, owner, repo, pullNumber)

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing,
      body,
    })
  }
  else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    })
  }
}

async function deleteExistingComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<void> {
  const existing = await findComment(octokit, owner, repo, pullNumber)
  if (existing) {
    await octokit.rest.issues.deleteComment({ owner, repo, comment_id: existing })
  }
}

async function findComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<number | null> {
  let page = 1

  while (true) {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pullNumber,
      per_page: 100,
      page,
      direction: 'desc',
    })

    const existing = comments.find(c => c.body?.includes(COMMENT_MARKER))
    if (existing)
      return existing.id

    if (comments.length < 100)
      return null

    page++
  }
}

async function getCommitMessages(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string[]> {
  try {
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    })
    return commits.map(c => c.commit.message)
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    core.warning(`Failed to fetch commit messages: ${reason}. AI heuristic will rely on line-count only.`)
    return []
  }
}

if (process.env.HUMANFILE_ACTION_DISABLE_AUTORUN !== '1') {
  void run()
}
