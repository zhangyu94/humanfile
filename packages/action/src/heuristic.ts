import type { ChangedFile } from './types'
import { evaluateAiHeuristic } from 'humanfile'

/**
 * Estimate whether a PR is likely AI-generated using change volume first,
 * then optional commit-message signals as a secondary heuristic.
 */
export function isLikelyAiGenerated(
  changedFiles: ChangedFile[],
  threshold: number,
  commitMessages: string[] = [],
): { likely: boolean, totalLinesChanged: number } {
  const result = evaluateAiHeuristic(changedFiles, threshold, commitMessages)
  return {
    likely: result.likelyAiGenerated,
    totalLinesChanged: result.totalLinesChanged,
  }
}
