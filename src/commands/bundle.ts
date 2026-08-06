/**
 * Bundle 命令 - CLI 层
 *
 * 仅负责命令行接线：选项解析（-d 目录 / -f 文件二选一、-o 输出目录）、日志级别设置、
 * 路径校验、调用核心业务（core/bundler）并输出耗时与错误处理。
 */

import * as path from 'path';
import chalk from 'chalk';
import type { Command } from 'commander';
import { logger, resolvePath, assertDirectory, assertFile, getExtension, setLogLevel } from '../utils';
import { toErrorMessage } from '../utils/errors';
import { bundleIpaFiles } from '../core/bundler';
import type { BundleOptions } from '../core/bundler';

/** Commander 解析出的 bundle 选项 */
interface BundleCommandOptions {
  directory?: string;
  file?: string;
  output?: string;
  keepDir?: boolean | string;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * 注册 bundle 子命令
 * @param program Commander program 实例
 */
export function registerCommand(program: Command): void {
  program
    .command('bundle')
    .description('Rename IPA files with bundle identifier')
    .option('-d, --directory <path>', 'Directory containing IPA files to process')
    .option('-f, --file <path>', 'Single IPA file to process')
    .option('-o, --output <directory>', 'Output directory for renamed files')
    .option('--keep-dir [value]', 'Keep original directory structure in output directory', false)
    .option('--dry-run', 'Simulate execution without renaming files', false)
    .option('-v, --verbose', 'Display verbose output', false)
    .action(async (commandOptions: BundleCommandOptions) => {
      // verbose 开启详细日志级别
      setLogLevel(commandOptions.verbose ? 'verbose' : 'info');

      try {
        if (commandOptions.directory && commandOptions.file) {
          throw new Error('Specify either --directory (-d) or --file (-f), not both');
        }
        if (!commandOptions.directory && !commandOptions.file) {
          throw new Error('Specify either --directory (-d) or --file (-f)');
        }

        const startTime = Date.now();
        const options: BundleOptions = {
          dryRun: Boolean(commandOptions.dryRun),
          keepDir: commandOptions.keepDir === true || commandOptions.keepDir === 'true',
        };
        if (commandOptions.output) {
          options.output = resolvePath(commandOptions.output);
        }

        if (commandOptions.directory) {
          const directory = resolvePath(commandOptions.directory);
          await assertDirectory(directory);
          options.directory = directory;
        } else {
          const file = resolvePath(commandOptions.file!);
          await assertFile(file);
          if (getExtension(path.basename(file)).toLowerCase() !== '.ipa') {
            throw new Error(`Not an IPA file: ${file}`);
          }
          options.file = file;
        }

        await bundleIpaFiles(options);

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
