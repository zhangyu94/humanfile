import type { AnalysisResult } from './types'

function escapeTableCell(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('`', '\\`')
}

/**
 * Build a markdown comment body summarizing violations.
 */
export function buildComment(result: AnalysisResult): string {
  const severity = result.likelyAiGenerated ? 'Warning' : 'Info'
  const icon = result.likelyAiGenerated ? '⚠️' : 'ℹ️'

  const readonlyViolations = result.violations.filter(
    v => v.level === 'readonly',
  )
  const confirmViolations = result.violations.filter(
    v => v.level === 'confirm',
  )

  const lines: string[] = [
    `## ${icon} humanfile — Protected Files Modified`,
    '',
    `**Severity:** ${severity}`,
    `**Total lines changed:** ${result.totalLinesChanged}`,
    result.likelyAiGenerated
      ? '**This PR appears to be AI-generated** (large-scale changes detected).'
      : '',
    '',
  ]

  if (readonlyViolations.length > 0) {
    lines.push(
      '### 🔒 Readonly-Protected Files Modified',
      '',
      'These files are marked as **readonly** in `.human`. AI changes require a human to remove `!` for that path first.',
      '',
      '| File | Additions | Deletions |',
      '|------|-----------|-----------|',
      ...readonlyViolations.map(
        v => `| \`${escapeTableCell(v.filename)}\` | +${v.additions} | -${v.deletions} |`,
      ),
      '',
    )
  }

  if (confirmViolations.length > 0) {
    lines.push(
      '### 👤 Confirm-Protected Files Modified',
      '',
      'These files are marked as **confirm** in `.human` and require explicit human permission before AI edits:',
      '',
      '| File | Additions | Deletions |',
      '|------|-----------|-----------|',
      ...confirmViolations.map(
        v => `| \`${escapeTableCell(v.filename)}\` | +${v.additions} | -${v.deletions} |`,
      ),
      '',
    )
  }

  lines.push(
    '---',
    '*Posted by [humanfile](https://github.com/zhangyu94/humanfile) — defining boundaries in AI coding.*',
  )

  return lines.join('\n')
}
