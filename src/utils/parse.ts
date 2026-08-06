/**
 * 文件信息解析模块
 *
 * 将「相对/完整路径的 IPA 文件名」（如 `~/path/to/some/dir/微信 8.0.33.ipa`）
 * 解析为关联信息 JSON：包含相对/绝对目录与路径、文件名解析信息
 * （filename/name/suffix/appName/version 等）与目标文件名。
 * 仅面向 .ipa 文件，因此不包含 isIPA 标记。
 */

import * as path from 'path';
import { buildTargetFilename, parseFilename } from './filename';
import { parsePath } from './path';

/** 解析选项 */
export interface ParseFileOptions {
  /** 相对路径的基准目录，默认当前工作目录 */
  baseDir?: string;
}

/** 文件关联信息（parseFile 的返回结果） */
export interface FileInfo {
  /** 绝对路径（含文件名） */
  absolutePath: string;
  /** 绝对目录（不含文件名） */
  absoluteDir: string;
  /** 相对路径（相对 baseDir，含文件名） */
  relativePath: string;
  /** 相对目录（相对 baseDir，不含文件名） */
  relativeDir: string;
  /** 文件名（含扩展名），如 `微信 8.0.33.ipa` */
  filename: string;
  /** 不含扩展名的文件名，如 `微信 8.0.33` */
  name: string;
  /** 文件扩展名（含前导点），如 `.ipa` */
  suffix: string;
  /** 应用名 */
  appName: string;
  /** 版本号（存在版本系列时拼接为 `7 7.10.2`） */
  version: string;
  /** 版本系列号（可选） */
  series: string | null;
  /** 构建号（可选） */
  buildNumber: string | null;
  /** 时间戳（可选，14 位数字） */
  timestamp: string | null;
  /** Bundle ID（可选） */
  bundleId: string | null;
  /** 去除时间戳后的目标文件名 */
  targetFilename: string;
}

/**
 * 解析 IPA 文件路径的关联信息
 *
 * 输入支持绝对路径、相对路径以及 `~` 开头的路径；
 * 文件名不符合 IPA 命名格式时返回 null。
 *
 * @example
 * ```typescript
 * const info = parseFile('~/path/to/some/dir/微信 8.0.33.ipa');
 * // {
 * //   absolutePath: '/Users/xxx/path/to/some/dir/微信 8.0.33.ipa',
 * //   absoluteDir: '/Users/xxx/path/to/some/dir',
 * //   relativePath: 'path/to/some/dir/微信 8.0.33.ipa',
 * //   relativeDir: 'path/to/some/dir',
 * //   filename: '微信 8.0.33.ipa',
 * //   name: '微信 8.0.33',
 * //   suffix: '.ipa',
 * //   appName: '微信',
 * //   version: '8.0.33',
 * //   series: null,
 * //   buildNumber: null,
 * //   timestamp: null,
 * //   bundleId: null,
 * //   targetFilename: '微信 8.0.33.ipa',
 * // }
 * ```
 *
 * @param input 输入路径（相对/绝对/`~` 开头均可）
 * @param options 解析选项
 * @returns 文件关联信息；非 IPA 文件名返回 null
 */
export function parseFile(input: string, options: ParseFileOptions = {}): FileInfo | null {
  const baseDir = options.baseDir ?? process.cwd();
  const pathInfo = parsePath(input, baseDir);
  const filename = path.basename(pathInfo.absolutePath);
  const parsed = parseFilename(filename);

  if (!parsed) {
    return null;
  }

  return {
    absolutePath: pathInfo.absolutePath,
    absoluteDir: pathInfo.absoluteDir,
    relativePath: pathInfo.relativePath,
    relativeDir: pathInfo.relativeDir,
    ...parsed,
    targetFilename: buildTargetFilename(parsed),
  };
}
