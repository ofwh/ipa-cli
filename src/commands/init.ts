import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import chalk from 'chalk'

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize a new project')
    .action(async () => {
      console.log(chalk.cyan('Welcome to ipa init!'))

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is the name of your project?',
          default: 'my-project',
        },
      ])

      const spinner = ora('Initializing project...').start()

      // Simulate work
      setTimeout(() => {
        spinner.succeed(
          chalk.green(
            `Project ${answers.projectName} initialized successfully!`,
          ),
        )
      }, 2000)
    })
}
