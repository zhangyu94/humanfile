import { defineCommand } from 'citty'
import pc from 'picocolors'
import { discoverRuleSets } from '../loader'

export const lsCommand = defineCommand({
  meta: {
    name: 'ls',
    description: 'List all .human files and their rule counts',
  },
  async run() {
    const cwd = process.cwd()
    const ruleSets = await discoverRuleSets(cwd)

    if (ruleSets.length === 0) {
      console.log(pc.dim('No .human files found.'))
      return
    }

    for (const rs of ruleSets) {
      const location = rs.directory === '' ? '.human' : `${rs.directory}/.human`
      const confirmCount = rs.rules.filter(r => r.level === 'confirm').length
      const readonlyCount = rs.rules.filter(r => r.level === 'readonly').length

      console.log(
        `  ${pc.bold(location)}`,
        pc.dim('—'),
        pc.yellow(`${confirmCount} confirm`),
        pc.dim('/'),
        pc.red(`${readonlyCount} readonly`),
        pc.dim(`(${rs.rules.length} rules)`),
      )
    }
  },
})
