export interface ChangedFile {
  filename: string
  additions: number
  deletions: number
}

export interface Violation {
  filename: string
  level: 'confirm' | 'readonly'
  additions: number
  deletions: number
}

export interface AnalysisResult {
  violations: Violation[]
  likelyAiGenerated: boolean
  totalLinesChanged: number
}
