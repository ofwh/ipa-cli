/**
 * Classify 命令 - CLI 层
 *
 * 仅负责命令行接线：选项解析、日志级别设置、目录校验、
 * 调用核心业务（core/classifier）并输出耗时与错误处理。
 */

import chalk from 'chalk';
import type { Command } from 'commander';
import { logger, resolvePath, assertDirectory, setLogLevel } from '../utils';
import { toErrorMessage } from '../utils/errors';
import { classifyIpaFiles } from '../core/classifier';
import type { ClassifyOptions } from '../core/classifier';

/** Commander 解析出的 classify 选项 */
interface ClassifyCommandOptions {
  directory?: string;
  output?: string;
  copy?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * 注册 classify 子命令
 * @param program Commander program 实例
 */
export function registerCommand(program: Command): void {
  program
    .command('classify')
    .description('Classify IPA files by app name')
    .option('-d, --directory <path>', 'Specify directory path to process', process.cwd())
    .option('-o, --output <directory>', 'Output directory for classified files', 'Versions')
    .option('-c, --copy', 'Copy files instead of moving them', false)
    .option('--dry-run', 'Simulate execution without moving files', false)
    .option('-v, --verbose', 'Display verbose output', false)
    .action(async (commandOptions: ClassifyCommandOptions) => {
      // 路径解析支持绝对/相对/`~` 开头路径
      const directory = resolvePath(commandOptions.directory ?? process.cwd());
      const output = resolvePath(commandOptions.output ?? 'Versions');

      // verbose 开启详细日志级别
      setLogLevel(commandOptions.verbose ? 'verbose' : 'info');

      try {
        await assertDirectory(directory);

        const startTime = Date.now();
        const options: ClassifyOptions = {
          directory,
          output,
          copy: Boolean(commandOptions.copy),
          dryRun: Boolean(commandOptions.dryRun),
        };
        await classifyIpaFiles(options);

        if (!commandOptions.dryRun) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          logger.info(chalk.dim(`   - Duration: ${duration}s`));
        }
      } catch (error) {
        logger.error(`Error: ${toErrorMessage(error)}`);
        if (commandOptions.verbose && error instanceof Error && error.stack) {
          logger.verbose(error.stack);
        }
        process.exit(1);
      }
    });
}
