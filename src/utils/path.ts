/**
 * 路径解析模块
 *
 * 负责路径的标准化处理：`~` 展开、绝对/相对路径解析、
 * 目录与文件的拆分，以及相对路径计算。纯函数模块。
 */

import * as os from 'os';
import * as path from 'path';

/** 路径解析结果 */
export interface PathInfo {
  /** 原始输入路径（未经展开） */
  input: string;
  /** 绝对路径（含文件名） */
  absolutePath: string;
  /** 绝对目录（不含文件名） */
  absoluteDir: string;
  /** 相对路径（相对 baseDir，含文件名） */
  relativePath: string;
  /** 相对目录（相对 baseDir，不含文件名） */
  relativeDir: string;
}

/** 是否为 `~` 开头的主目录路径 */
const HOME_PREFIX_REGEX = /^~(\/|\\)?/;

/**
 * 展开 `~` 为用户主目录
 * @param filePath 路径，如 `~/path/to/file.ipa`
 * @returns 展开后的路径
 */
export function expandHome(filePath: string): string {
  if (filePath === '~') {
    return os.homedir();
  }

  const match = HOME_PREFIX_REGEX.exec(filePath);
  if (match && match[1]) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

/**
 * 将输入路径解析为绝对路径（先展开 `~`）
 * @param input 输入路径（绝对或相对均可）
 * @param baseDir 相对路径的基准目录，默认当前工作目录
 * @returns 绝对路径
 */
export function resolvePath(input: string, baseDir: string = process.cwd()): string {
  return path.resolve(baseDir, expandHome(input));
}

/**
 * 拆分路径，得到绝对/相对目录与完整路径
 * @param input 输入路径（如 `~/path/to/some/dir/微信 8.0.33.ipa`）
 * @param baseDir 相对路径的基准目录，默认当前工作目录
 * @returns 路径信息（absolutePath/absoluteDir/relativePath/relativeDir）
 */
export function parsePath(input: string, baseDir: string = process.cwd()): PathInfo {
  const absolutePath = resolvePath(input, baseDir);
  const absoluteDir = path.dirname(absolutePath);
  const relativePath = path.relative(baseDir, absolutePath);
  const relativeDir = path.dirname(relativePath);

  return {
    input,
    absolutePath,
    absoluteDir,
    relativePath,
    relativeDir,
  };
}
