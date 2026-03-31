import { spawnSync } from 'node:child_process'
import { platform } from 'node:os'

export type Status = 'pass' | 'fail' | 'manual-required' | 'unsupported'

export interface BaseResult {
  editor: string
  mode: string
  scenarioId: string
  expected: string
  observed: string
  status: Status
  evidence?: string
  agentReply?: string
}

export interface ComplianceReport<Result extends BaseResult = BaseResult> {
  specVersion: string
  generatedAt: string
  runner: {
    os: string
    node: string
    package: string
  }
  results: Result[]
}

export function overallFromStatuses(statuses: Status[]): { overall: Status, exitCode: number } {
  if (statuses.includes('fail'))
    return { overall: 'fail', exitCode: 1 }
  if (statuses.includes('unsupported'))
    return { overall: 'unsupported', exitCode: 2 }
  if (statuses.includes('manual-required'))
    return { overall: 'manual-required', exitCode: 3 }
  return { overall: 'pass', exitCode: 0 }
}

export function printSummary<Result extends BaseResult>(opts: {
  report: ComplianceReport<Result>
  reportPath: string
  label: string
}): void {
  const { report, reportPath, label } = opts
  const statuses = report.results.map(r => r.status)
  const counts = statuses.reduce<Record<Status, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, { 'manual-required': 0, 'fail': 0, 'pass': 0, 'unsupported': 0 })

  const { overall, exitCode } = overallFromStatuses(statuses)
  const summary = [
    `${label} runtime: OVERALL=${overall}`,
    `pass=${counts.pass}`,
    `fail=${counts.fail}`,
    `unsupported=${counts.unsupported}`,
    `manual=${counts['manual-required']}`,
    `report=${reportPath}`,
  ].join(' ')

  console.log(summary)
  process.exitCode = exitCode
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function nodeVersion(): string {
  return process.version
}

export function hasCommand(cmd: string): boolean {
  const probe = platform() === 'win32' ? 'where' : 'which'
  const res = spawnSync(probe, [cmd], { stdio: 'ignore' })
  return res.status === 0
}
