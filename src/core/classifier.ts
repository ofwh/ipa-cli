/**
 * 分类整理核心业务模块
 *
 * 与 CLI 无关的纯业务层：扫描 → 解析（parseFile）→ 规划操作 →
 * dry-run 预览 / 实际执行 → 清理空目录 → 统计。
 * 所有输出经由 logger，受日志级别控制。
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { logger, parseFile, findIpaFiles, copyFile, moveFile, removeEmptyDirs } from '../utils';
import { toErrorMessage } from '../utils/errors';

/** classify 业务选项 */
export interface ClassifyOptions {
  /** 待处理目录路径（绝对路径） */
  directory: string;
  /** 输出目录（分类结果的根目录） */
  output?: string;
  /** 复制而非移动 */
  copy?: boolean;
  /** 模拟运行（不执行任何 IO） */
  dryRun?: boolean;
}

/** 分类统计结果（可序列化） */
export interface ClassifyStats {
  /** 扫描到的 IPA 文件总数 */
  scanned: number;
  /** 成功处理的文件数 */
  processed: number;
  /** 失败的文件数（IO 错误） */
  failed: number;
  /** 跳过的文件数（解析失败） */
  skipped: number;
  /** 将创建的应用名文件夹数量 */
  foldersCreated: number;
  /** 覆盖文件数 */
  filesOverwritten: number;
  /** 移除时间戳的文件数 */
  filesRenamed: number;
  /** 清理的空目录数（仅移动模式实际执行时存在） */
  emptyDirectoriesRemoved?: number;
}

/** 单个文件的操作计划 */
interface Operation {
  source: string;
  target: string;
  sourceName: string;
  targetName: string;
  appName: string;
  hasTimestamp: boolean;
  willOverwrite: boolean;
}

/**
 * 执行 IPA 文件分类整理流程
 * @param options 分类选项
 * @returns 统计结果
 */
export async function classifyIpaFiles(options: ClassifyOptions): Promise<ClassifyStats> {
  const { directory, output = 'Versions', copy = false } = options;
  const dryRun = Boolean(options.dryRun);

  if (dryRun) {
    logger.warn(`Dry-run mode (--dry-run)\n`);
  }
  if (copy) {
    logger.info(`Copy mode (--copy)\n`);
  }
  logger.info(`Scanning directory: ${chalk.cyan(directory)}`);

  // 扫描文件（异步并行递归）
  const files = await findIpaFiles(directory);
  logger.info(`Found ${chalk.bold(String(files.length))} .ipa file(s)\n`);

  const stats: ClassifyStats = {
    scanned: files.length,
    processed: 0,
    failed: 0,
    skipped: 0,
    foldersCreated: 0,
    filesOverwritten: 0,
    filesRenamed: 0,
  };

  if (files.length === 0) {
    logger.info(`No .ipa files found`);
    return stats;
  }

  // 解析所有文件并规划操作
  const operations: Operation[] = [];
  const failedParsing: string[] = [];
  const appFolders = new Set<string>();

  for (const file of files) {
    const info = parseFile(file.path);
    logger.verbose(
      `Parsed ${file.name} → app=${info?.appName ?? '-'}, version=${info?.version ?? '-'}, timestamp=${info?.timestamp ?? '-'}, target=${info?.targetFilename ?? '-'}`,
    );

    if (!info) {
      failedParsing.push(file.name);
      stats.skipped++;
      continue;
    }

    const targetFolder = path.join(output, info.appName);
    const targetPath = path.join(targetFolder, info.targetFilename);

    const hasTimestamp = info.timestamp !== null;
    const willOverwrite = fs.existsSync(targetPath);

    operations.push({
      source: file.path,
      target: targetPath,
      sourceName: file.name,
      targetName: info.targetFilename,
      appName: info.appName,
      hasTimestamp,
      willOverwrite,
    });

    appFolders.add(info.appName);
    if (hasTimestamp) {
      stats.filesRenamed++;
    }
    if (willOverwrite) {
      stats.filesOverwritten++;
    }
  }

  stats.foldersCreated = appFolders.size;
  const relativeOutput = path.relative(process.cwd(), output);

  // dry-run 模式：仅展示将执行的操作
  if (dryRun) {
    logger.info(`Operations to be performed:\n`);
    logger.info(chalk.bold('File operations:'));
    for (const op of operations) {
      logger.info(`  ${chalk.cyan('→')}  ${op.sourceName} ${chalk.dim('→')} ${displayPath(relativeOutput, op)}${operationTags(op, 'preview')}`);
    }
    logger.info('');
  } else {
    // 实际执行模式（顺序执行，避免并发 IO 竞争）
    logger.info(`Processing files...\n`);

    for (const op of operations) {
      try {
        if (copy) {
          await copyFile(op.source, op.target, { dryRun });
        } else {
          await moveFile(op.source, op.target, { dryRun });
        }

        logger.success(`  ✓  ${op.sourceName} ${chalk.dim('→')} ${displayPath(relativeOutput, op)}${operationTags(op, 'done')}`);
        stats.processed++;
      } catch (error) {
        logger.error(`  ✗  ${op.sourceName}: ${toErrorMessage(error)}${operationTags(op, 'failed')}`);
        stats.failed++;
      }
    }

    logger.info('');
  }

  // 移动模式实际执行后清理源目录中的空目录
  if (!dryRun && !copy && stats.processed > 0) {
    const removed = await removeEmptyDirs(directory);
    if (removed > 0) {
      stats.emptyDirectoriesRemoved = removed;
    }
  }

  // 展示解析失败的文件
  if (failedParsing.length > 0) {
    logger.warn(`\nSkipped files (unable to parse):`);
    failedParsing.slice(0, 10).forEach((name) => {
      logger.warn(`  - ${name}`);
    });
    if (failedParsing.length > 10) {
      logger.warn(chalk.dim(`  ... and ${failedParsing.length - 10} more`));
    }
  }

  printSummary(stats, operations.length, dryRun);

  return stats;
}

/** 构建输出展示路径（基于预先计算好的 relativeOutput） */
function displayPath(relativeOutput: string, op: Operation): string {
  return path.join(relativeOutput, op.appName, op.targetName);
}

type TagPhase = 'preview' | 'done' | 'failed';

/** 构建操作描述标签 */
function operationTags(op: Operation, phase: TagPhase): string {
  const tags: string[] = [];
  if (op.hasTimestamp) {
    tags.push(chalk.blue(phase === 'failed' ? 'would rename' : 'renamed'));
  }
  if (op.willOverwrite) {
    tags.push(chalk.yellow(phase === 'done' ? 'overwritten' : phase === 'failed' ? 'would overwrite' : 'overwrite'));
  }
  return tags.length > 0 ? ` ${chalk.dim('(')}${tags.join(chalk.dim(', '))}${chalk.dim(')')}` : '';
}

/** 输出统计汇总 */
function printSummary(stats: ClassifyStats, filesToProcess: number, dryRun: boolean): void {
  logger.info(`\n${dryRun ? 'Summary' : 'Complete'}:`);
  if (dryRun) {
    logger.info(`   - Files to process: ${chalk.bold(String(filesToProcess))}`);
    logger.info(`   - Folders to create: ${chalk.bold(String(stats.foldersCreated))}`);
    if (stats.filesOverwritten > 0) {
      logger.info(`   - Files to overwrite: ${chalk.yellow(String(stats.filesOverwritten))}`);
    }
    if (stats.filesRenamed > 0) {
      logger.info(`   - Files to rename: ${chalk.bold(String(stats.filesRenamed))}`);
    }
    if (stats.skipped > 0) {
      logger.info(`   - Files to skip: ${chalk.yellow(String(stats.skipped))}`);
    }
    logger.info(chalk.cyan(`\nRemove --dry-run to execute actual operations`));
  } else {
    logger.info(`   - Files processed: ${chalk.green(String(stats.processed))}`);
    logger.info(`   - Folders created: ${chalk.bold(String(stats.foldersCreated))}`);
    if (stats.emptyDirectoriesRemoved !== undefined) {
      logger.info(`   - Empty directories removed: ${chalk.bold(String(stats.emptyDirectoriesRemoved))}`);
    }
    if (stats.filesOverwritten > 0) {
      logger.info(`   - Files overwritten: ${chalk.yellow(String(stats.filesOverwritten))}`);
    }
    if (stats.filesRenamed > 0) {
      logger.info(`   - Files renamed: ${chalk.bold(String(stats.filesRenamed))}`);
    }
    if (stats.failed > 0) {
      logger.info(`   - Failed: ${chalk.red(String(stats.failed))}`);
    }
    if (stats.skipped > 0) {
      logger.info(`   - Skipped: ${chalk.yellow(String(stats.skipped))}`);
    }
  }
}
