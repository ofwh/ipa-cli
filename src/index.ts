#!/usr/bin/env node
import { Command } from 'commander'
import { version } from '../package.json'

const program = new Command()

program.name('ipa').version(version).description('A fantastic CLI tool')

// Register commands here
import { registerInitCommand } from './commands/init'
registerInitCommand(program)

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
