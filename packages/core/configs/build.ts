import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

for (const { platform, path, transform } of targets) {
  const content = transform ? transform(source) : source
  const outputPath = join(outDir, platform, path)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, content, 'utf-8')
}

const cursorRule = readFileSync(join(__dirname, 'sources/cursor/humanfile.mdc'), 'utf-8')
const cursorOutPath = join(outDir, 'cursor/.cursor/rules/humanfile.mdc')
mkdirSync(dirname(cursorOutPath), { recursive: true })
writeFileSync(cursorOutPath, cursorRule, 'utf-8')

const skillSource = readFileSync(join(__dirname, 'skills/humanfile/SKILL.md'), 'utf-8')
const skillOutPath = join(outDir, 'skills/humanfile/SKILL.md')
mkdirSync(dirname(skillOutPath), { recursive: true })
writeFileSync(skillOutPath, skillSource, 'utf-8')

console.log(`Generated ${targets.length + 2} config files in generated/`)
