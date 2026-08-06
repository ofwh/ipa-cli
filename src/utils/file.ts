/**
 * 文件系统操作模块
 *
 * 负责与文件系统相关的全部操作：递归扫描 IPA 文件、目录校验、
 * 文件复制/移动（含跨文件系统回退）、空目录清理。
 *
 * 全部使用异步 API（fs/promises），递归扫描并行处理子目录，
 * 避免在大量文件场景下阻塞事件循环。
 */

import { promises as fsp } from 'fs';
import type { Dirent } from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { hasErrorCode, toErrorMessage } from './errors';

/** 扫描到的文件条目 */
export interface FileEntry {
  /** 文件完整路径 */
  path: string;
  /** 文件名（含扩展名） */
  name: string;
}

/** 文件操作选项 */
export interface FileOperationOptions {
  /** 模拟运行（true 时不执行任何 IO） */
  dryRun?: boolean;
}

/**
 * 递归扫描目录，收集所有 `.ipa` 文件
 *
 * 子目录并行扫描（Promise.all），无法读取的子目录记录警告后跳过；
 * 根目录无法读取时抛出异常。
 *
 * @param directory 目录路径
 * @returns IPA 文件条目列表
 */
export async function findIpaFiles(directory: string): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  await scanRecursive(directory, directory, files);
  return files;
}

async function scanRecursive(dir: string, root: string, files: FileEntry[]): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (dir === root) {
      throw new Error(`Cannot read directory: ${dir} - ${toErrorMessage(error)}`);
    }
    logger.warn(`Cannot read directory: ${dir} - ${toErrorMessage(error)}`);
    return;
  }

  const subTasks: Promise<void>[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.ipa')) {
      files.push({ path: fullPath, name: entry.name });
    } else if (entry.isDirectory()) {
      subTasks.push(scanRecursive(fullPath, root, files));
    }
  }
  await Promise.all(subTasks);
}

/**
 * 确保目标目录存在（不存在时递归创建）
 * @param filePath 目标文件路径
 */
export async function ensureDir(filePath: string): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

/**
 * 复制文件
 * @param source 源文件路径
 * @param target 目标文件路径
 * @param options 操作选项
 */
export async function copyFile(
  source: string,
  target: string,
  options: FileOperationOptions = {},
): Promise<void> {
  if (options.dryRun) {
    return;
  }

  try {
    await ensureDir(target);
    await fsp.copyFile(source, target);
  } catch (error) {
    throw new Error(`Failed to copy file: ${toErrorMessage(error)}`);
  }
}

/**
 * 移动文件（跨文件系统时回退为复制 + 删除）
 * @param source 源文件路径
 * @param target 目标文件路径
 * @param options 操作选项
 */
export async function moveFile(
  source: string,
  target: string,
  options: FileOperationOptions = {},
): Promise<void> {
  if (options.dryRun) {
    return;
  }

  try {
    await ensureDir(target);

    try {
      await fsp.rename(source, target);
    } catch (error) {
      if (hasErrorCode(error, 'EXDEV')) {
        // 跨文件系统：复制后删除源文件
        await fsp.copyFile(source, target);
        await fsp.unlink(source);
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw new Error(`Failed to move file: ${toErrorMessage(error)}`);
  }
}

/**
 * 校验目录存在且为有效目录；无效时抛出异常
 * @param directory 目录路径
 */
export async function assertDirectory(directory: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fsp.stat>>;
  try {
    stat = await fsp.stat(directory);
  } catch {
    throw new Error(`Directory does not exist: ${directory}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`Not a valid directory: ${directory}`);
  }
}

/**
 * 校验文件存在且为有效文件；无效时抛出异常
 * @param file 文件路径
 */
export async function assertFile(file: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fsp.stat>>;
  try {
    stat = await fsp.stat(file);
  } catch {
    throw new Error(`File does not exist: ${file}`);
  }

  if (!stat.isFile()) {
    throw new Error(`Not a valid file: ${file}`);
  }
}

/**
 * 递归清理空目录（不删除根目录本身）
 *
 * 后序遍历：先处理子目录，再检查当前目录是否为空。
 *
 * @param directory 根目录
 * @returns 移除的目录数量
 */
export async function removeEmptyDirs(directory: string): Promise<number> {
  let removedCount = 0;

  async function cleanRecursive(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (error) {
      logger.warn(`Cannot process directory: ${dir} - ${toErrorMessage(error)}`);
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await cleanRecursive(path.join(dir, entry.name));
      }
    }

    const remaining = await fsp.readdir(dir);
    if (remaining.length === 0 && dir !== directory) {
      try {
        await fsp.rmdir(dir);
        removedCount++;
      } catch (error) {
        logger.warn(`Cannot remove directory: ${dir} - ${toErrorMessage(error)}`);
      }
    }
  }

  try {
    await cleanRecursive(directory);
  } catch (error) {
    logger.warn(`Failed to clean up directories: ${toErrorMessage(error)}`);
  }

  return removedCount;
}
