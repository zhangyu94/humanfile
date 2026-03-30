import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { classifyAll } from '../../src/loader.js'

interface BenchResult {
  caseName: string
  fileCount: number
  totalMs: number
  perFileUs: number
  rssBeforeMb: number
  rssAfterMb: number
  rssDeltaMb: number
}

const DEFAULT_SIZES = [1000, 10000, 50000]

function parseSizesArg(): number[] {
  const arg = process.argv.find(item => item.startsWith('--sizes='))
  if (!arg)
    return DEFAULT_SIZES

  const values = arg
    .slice('--sizes='.length)
    .split(',')
    .map(n => Number.parseInt(n.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0)

  return values.length > 0 ? values : DEFAULT_SIZES
}

async function writeFixtureFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
}

async function createSyntheticRepo(root: string, fileCount: number): Promise<void> {
  await writeFixtureFile(
    join(root, '.human'),
    `${['src/', 'docs/specs/', 'packages/*/src/generated/', 'packages/*/src/'].join('\n')}\n`,
  )

  await writeFixtureFile(join(root, 'src/.human'), `${['!legacy/', 'legacy/migrations/'].join('\n')}\n`)

  const filesPerBucket = Math.max(1, Math.floor(fileCount / 5))

  for (let i = 0; i < filesPerBucket; i++) {
    await writeFixtureFile(join(root, `src/features/feature-${i}.ts`), `export const f${i} = ${i};\n`)
    await writeFixtureFile(join(root, `src/legacy/file-${i}.ts`), `export const l${i} = ${i};\n`)
    await writeFixtureFile(
      join(root, `src/legacy/migrations/m-${i}.ts`),
      `export const m${i} = ${i};\n`,
    )
    await writeFixtureFile(join(root, `docs/specs/doc-${i}.md`), `# doc ${i}\n`)
    await writeFixtureFile(
      join(root, `packages/pkg-${i % 20}/src/generated/g-${i}.ts`),
      `export const g${i} = ${i};\n`,
    )
  }
}

async function runCase(fileCount: number): Promise<BenchResult> {
  const tempRoot = await mkdtemp(join(tmpdir(), `humanfile-bench-${fileCount}-`))
  const repoRoot = join(tempRoot, 'repo')

  try {
    await createSyntheticRepo(repoRoot, fileCount)

    const rssBeforeMb = process.memoryUsage().rss / (1024 * 1024)
    const start = performance.now()
    const classifications = await classifyAll(repoRoot)
    const totalMs = performance.now() - start
    const rssAfterMb = process.memoryUsage().rss / (1024 * 1024)

    const realCount = classifications.size

    return {
      caseName: `${fileCount.toLocaleString()} files`,
      fileCount: realCount,
      totalMs: Number(totalMs.toFixed(2)),
      perFileUs: Number(((totalMs * 1000) / realCount).toFixed(2)),
      rssBeforeMb: Number(rssBeforeMb.toFixed(2)),
      rssAfterMb: Number(rssAfterMb.toFixed(2)),
      rssDeltaMb: Number((rssAfterMb - rssBeforeMb).toFixed(2)),
    }
  }
  finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  const sizes = parseSizesArg()
  const results: BenchResult[] = []

  for (const size of sizes) {
    results.push(await runCase(size))
  }

  console.log('humanfile classifyAll benchmark')
  console.table(
    results.map(r => ({
      case: r.caseName,
      files: r.fileCount,
      totalMs: r.totalMs,
      perFileUs: r.perFileUs,
      rssDeltaMb: r.rssDeltaMb,
    })),
  )

  console.log('JSON_RESULT_START')
  console.log(JSON.stringify(results, null, 2))
  console.log('JSON_RESULT_END')
}

void main()
