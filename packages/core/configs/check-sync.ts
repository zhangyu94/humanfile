#!/usr/bin/env tsx

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(__dirname, 'sources/_source.md'), 'utf-8')
const BOLD_MARKDOWN_RE = /\*\*([^*]+)\*\*/g

function stripMarkdownFormatting(text: string): string {
  return text
    .replaceAll(BOLD_MARKDOWN_RE, '$1')
    .replaceAll('→', '=')
}

const targets: { platform: string, path: string, transform: ((text: string) => string) | null }[] = [
  { platform: 'claude', path: 'CLAUDE.md', transform: null },
  { platform: 'copilot', path: '.github/copilot-instructions.md', transform: null },
  { platform: 'codex', path: 'AGENTS.md', transform: null },
  { platform: 'windsurf', path: '.windsurfrules', transform: stripMarkdownFormatting },
  { platform: 'cline', path: '.clinerules', transform: stripMarkdownFormatting },
]

const outDir = join(__dirname, 'generated')
const cursorSource = readFileSync(join(__dirname, 'sources/cursor/humanfile.mdc'), 'utf-8')
const skillSource = readFileSync(join(__dirname, 'skills/humanfile/SKILL.md'), 'utf-8')

let drifted = false

for (const { platform, path, transform } of targets) {
  const expected = transform ? transform(source) : source
  const actual = readFileSync(join(outDir, platform, path), 'utf-8')
  if (actual !== expected) {
    console.error(`DRIFT: generated/${platform}/${path} differs from sources/_source.md`)
    drifted = true
  }
}

const actualCursor = readFileSync(join(outDir, 'cursor/.cursor/rules/humanfile.mdc'), 'utf-8')
if (actualCursor !== cursorSource) {
  console.error('DRIFT: generated/cursor/.cursor/rules/humanfile.mdc differs from sources/cursor/humanfile.mdc')
  drifted = true
}

const actualSkill = readFileSync(join(outDir, 'skills/humanfile/SKILL.md'), 'utf-8')
if (actualSkill !== skillSource) {
  console.error('DRIFT: generated/skills/humanfile/SKILL.md differs from skills/humanfile/SKILL.md')
  drifted = true
}

if (drifted) {
  console.error('\nRun `pnpm --filter humanfile exec tsx configs/build.ts` to regenerate.')
  process.exit(1)
}
else {
  console.log('All generated configs are in sync.')
}
