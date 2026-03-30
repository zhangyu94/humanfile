import type { AnalysisResult } from '../src/types.js'
import { describe, expect, it } from 'vitest'
import { buildComment } from '../src/comment.js'

describe('buildComment', () => {
  it('includes readonly violations section', () => {
    const result: AnalysisResult = {
      violations: [
        { filename: 'docs/specs/guide.md', level: 'readonly', additions: 5, deletions: 2 },
      ],
      likelyAiGenerated: false,
      totalLinesChanged: 7,
    }
    const comment = buildComment(result)
    expect(comment).toContain('Readonly-Protected Files Modified')
    expect(comment).toContain('docs/specs/guide.md')
    expect(comment).toContain('https://github.com/zhangyu94/humanfile')
    expect(comment).toContain('Posted by [humanfile]')
  })

  it('includes confirm violations section', () => {
    const result: AnalysisResult = {
      violations: [
        { filename: 'core/main.ts', level: 'confirm', additions: 50, deletions: 10 },
      ],
      likelyAiGenerated: false,
      totalLinesChanged: 60,
    }
    const comment = buildComment(result)
    expect(comment).toContain('Confirm-Protected Files Modified')
    expect(comment).toContain('core/main.ts')
    expect(comment).toContain('require explicit human permission')
  })

  it('shows AI warning when likely AI-generated', () => {
    const result: AnalysisResult = {
      violations: [
        { filename: 'docs/specs/guide.md', level: 'readonly', additions: 500, deletions: 600 },
      ],
      likelyAiGenerated: true,
      totalLinesChanged: 1100,
    }
    const comment = buildComment(result)
    expect(comment).toContain('AI-generated')
    expect(comment).toContain('Warning')
  })

  it('escapes pipe characters in filenames', () => {
    const result: AnalysisResult = {
      violations: [
        { filename: 'src/a|b.ts', level: 'confirm', additions: 1, deletions: 0 },
      ],
      likelyAiGenerated: false,
      totalLinesChanged: 1,
    }
    const comment = buildComment(result)
    expect(comment).toContain('a\\|b.ts')
    expect(comment).not.toContain('| a|b')
  })

  it('escapes backtick characters in filenames', () => {
    const result: AnalysisResult = {
      violations: [
        { filename: 'src/file`weird.ts', level: 'confirm', additions: 1, deletions: 0 },
      ],
      likelyAiGenerated: false,
      totalLinesChanged: 1,
    }
    const comment = buildComment(result)
    expect(comment).toContain('file\\`weird.ts')
  })
})
