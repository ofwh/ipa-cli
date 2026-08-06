/**
 * Bundle 重命名核心业务模块
 *
 * 与 CLI 解耦的纯业务层：扫描目录或处理单个文件 → 提取 Bundle ID →
 * 重命名为 `<原文件名>@<BundleID>.ipa`（默认原地；指定 output 时输出到目标目录，
 * keepDir 保留输入目录下的次级目录结构）→ dry-run 预览 / 实际执行 → 统计。
 * 所有输出经由 logger，受日志级别控制。
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { logger, findIpaFiles, moveFile, getExtension } from '../utils';
import { toErrorMessage } from '../utils/errors';
import { getBundleId } from '../utils/bundle';

/** bundle 业务选项 */
export interface BundleOptions {
  /** 待处理目录路径（与 file 二选一） */
  directory?: string;
  /** 单个 IPA 文件路径（与 directory 二选一） */
  file?: string;
  /** 输出目录（未提供时原地重命名） */
  output?: string;
  /** 输出时保留输入目录下的次级目录结构（仅 output 模式下生效） */
  keepDir?: boolean;
  /** 模拟运行（不执行任何 IO） */
  dryRun?: boolean;
}

/** bundle 统计结果（可序列化） */
export interface BundleStats {
  /** 扫描到的 IPA 文件总数 */
  scanned: number;
  /** 成功重命名的文件数 */
  renamed: number;
  /** 跳过的文件数（未找到 Bundle ID 或已带 Bundle 命名） */
  skipped: number;
  /** 失败的文件数（IO 错误） */
  failed: number;
}

/** 单个文件的操作计划 */
interface Operation {
  source: string;
  target: string;
  sourceName: string;
  targetName: string;
  willOverwrite: boolean;
  /** 文件名已带相同 Bundle ID（原地模式为无操作；输出模式仅移动不改名） */
  alreadyNamed: boolean;
}

/**
 * 执行 IPA 文件 Bundle 重命名流程
 *
 * 文件模式（file）只处理单个文件；目录模式（directory）递归扫描
 * 目录下全部 `.ipa` 文件。目标文件名规则（参考 src/utils/bundle.ts）：
 * `<不含扩展名的文件名>@<BundleID>.ipa`；未指定 output 时原地重命名，
 * 指定 output 时输出到该目录（keepDir 时按输入目录下的相对路径创建子目录）。
 *
 * @param options bundle 选项
 * @returns 统计结果
 */
export async function bundleIpaFiles(options: BundleOptions): Promise<BundleStats> {
  const dryRun = Boolean(options.dryRun);

  if (dryRun) {
    logger.warn(`Dry-run mode (--dry-run)\n`);
  }

  const source = options.file ?? options.directory ?? '';
  logger.info(`Processing: ${chalk.cyan(source)}`);

  // 收集待处理文件：文件模式直接使用；目录模式递归扫描
  const filePaths: string[] = [];
  if (options.file) {
    filePaths.push(options.file);
  } else if (options.directory) {
    filePaths.push(...(await findIpaFiles(options.directory)).map((entry) => entry.path));
  }
  logger.info(`Found ${chalk.bold(String(filePaths.length))} .ipa file(s)\n`);

  const stats: BundleStats = {
    scanned: filePaths.length,
    renamed: 0,
    skipped: 0,
    failed: 0,
  };

  if (filePaths.length === 0) {
    logger.info(`No .ipa files found`);
    return stats;
  }

  // 提取 Bundle ID 并规划操作
  const operations: Operation[] = [];
  const output = options.output;

  for (const filePath of filePaths) {
    const sourceName = path.basename(filePath);
    const bundleId = getBundleId(filePath);
    logger.verbose(`Read bundle id of ${sourceName} → ${bundleId ?? '-'}`);

    if (!bundleId) {
      stats.skipped++;
      logger.warn(`${sourceName}: CFBundleIdentifier not found, skipped`);
      continue;
    }

    const extension = getExtension(filePath);
    const alreadyNamed = sourceName
      .toLowerCase()
      .endsWith(`@${bundleId.toLowerCase()}${extension.toLowerCase()}`);
    const targetName = alreadyNamed
      ? sourceName
      : `${path.basename(filePath, extension)}@${bundleId}${extension}`;

    // 目标路径：输出模式下按 keepDir 计算相对子目录，否则平铺到输出目录
    const relativeDir =
      output && options.keepDir && options.directory
        ? path.relative(options.directory, path.dirname(filePath))
        : '';
    const targetPath = output
      ? path.join(output, relativeDir, targetName)
      : path.join(path.dirname(filePath), targetName);

    // 原地模式且文件名已带相同 Bundle ID（如 `QQ 8.9.88@com.tencent.qq.ipa`）：无操作，跳过
    if (!output && alreadyNamed) {
      stats.skipped++;
      operations.push({
        source: filePath,
        target: filePath,
        sourceName,
        targetName: sourceName,
        willOverwrite: false,
        alreadyNamed: true,
      });
      continue;
    }

    operations.push({
      source: filePath,
      target: targetPath,
      sourceName,
      targetName,
      willOverwrite: fs.existsSync(targetPath),
      alreadyNamed,
    });
  }

  // dry-run 模式：仅展示将执行的重命名
  if (dryRun) {
    if (operations.length > 0) {
      logger.info(`Operations to be performed:\n`);
      logger.info(chalk.bold('File operations:'));
      for (const op of operations) {
        logger.info(
          `  ${chalk.cyan('→')}  ${op.sourceName} ${chalk.dim('→')} ${displayTarget(op, output)}${operationTags(op, 'preview')}`,
        );
      }
      logger.info('');
    }
  } else {
    // 实际执行模式（顺序执行，避免并发 IO 竞争）
    if (operations.length > 0) {
      logger.info(`Renaming files...\n`);

      for (const op of operations) {
        if (op.source === op.target) {
          // 原地无操作（已带 Bundle ID），按跳过展示
          logger.success(
            `  ✓  ${op.sourceName} ${chalk.dim('→')} ${op.targetName}${operationTags(op, 'done')}`,
          );
          continue;
        }

        try {
          await moveFile(op.source, op.target, { dryRun });
          logger.success(
            `  ✓  ${op.sourceName} ${chalk.dim('→')} ${displayTarget(op, output)}${operationTags(op, 'done')}`,
          );
          stats.renamed++;
        } catch (error) {
          logger.error(`  ✗  ${op.sourceName}: ${toErrorMessage(error)}`);
          stats.failed++;
        }
      }

      logger.info('');
    }
  }

  const renameCount = operations.reduce((count, op) => (op.source === op.target ? count : count + 1), 0);
  printSummary(stats, renameCount, dryRun);

  return stats;
}

type TagPhase = 'preview' | 'done';

/** 构建操作描述标签（与 classify 的 overwrite 标签风格一致） */
function operationTags(op: Operation, phase: TagPhase): string {
  const tags: string[] = [];
  if (op.alreadyNamed && op.source === op.target) {
    tags.push(chalk.yellow(phase === 'preview' ? 'skip' : 'skipped'));
  }
  if (op.willOverwrite) {
    tags.push(chalk.yellow(phase === 'preview' ? 'overwrite' : 'overwritten'));
  }
  return tags.length > 0 ? ` ${chalk.dim('(')}${tags.join(chalk.dim(', '))}${chalk.dim(')')}` : '';
}

/** 构建展示目标路径（输出模式下相对输出目录展示） */
function displayTarget(op: Operation, output: string | undefined): string {
  if (!output) {
    return op.targetName;
  }
  const relative = path.relative(output, op.target);
  return relative || op.targetName;
}

/** 输出统计汇总 */
function printSummary(stats: BundleStats, filesToRename: number, dryRun: boolean): void {
  logger.info(`\n${dryRun ? 'Summary' : 'Complete'}:`);
  if (dryRun) {
    logger.info(`   - Files to rename: ${chalk.bold(String(filesToRename))}`);
    if (stats.skipped > 0) {
      logger.info(`   - Files to skip: ${chalk.yellow(String(stats.skipped))}`);
    }
    logger.info(chalk.cyan(`\nRemove --dry-run to execute actual operations`));
  } else {
    logger.info(`   - Files renamed: ${chalk.green(String(stats.renamed))}`);
    if (stats.skipped > 0) {
      logger.info(`   - Skipped: ${chalk.yellow(String(stats.skipped))}`);
    }
    if (stats.failed > 0) {
      logger.info(`   - Failed: ${chalk.red(String(stats.failed))}`);
    }
  }
}
