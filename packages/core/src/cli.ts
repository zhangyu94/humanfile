import { createRequire } from 'node:module'
import { defineCommand, runMain } from 'citty'
import { checkCommand } from './cli/check'
import { explainCommand } from './cli/explain'
import { guardCommand } from './cli/guard'
import { initCommand } from './cli/init'
import { installCommand } from './cli/install'
import { lsCommand } from './cli/ls'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

const main = defineCommand({
  meta: {
    name: 'humanfile',
    version,
    description: 'Define boundaries in AI coding — manage .human files',
  },
  subCommands: {
    check: checkCommand,
    explain: explainCommand,
    guard: guardCommand,
    init: initCommand,
    install: installCommand,
    ls: lsCommand,
  },
})

runMain(main)
