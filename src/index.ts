/**
 * IPA Classifier - 程序化接口
 *
 * 面向 Node.js 脚本的程序化 API：分类整理核心业务、
 * 文件名/路径/文件信息解析工具、文件系统操作与日志控制。
 */

// 核心业务
export { classifyIpaFiles } from './core/classifier';
export type { ClassifyOptions, ClassifyStats } from './core/classifier';
export { bundleIpaFiles } from './core/bundler';
export type { BundleOptions, BundleStats } from './core/bundler';

// 命令模块
export { classifyCommand, bundleCommand } from './commands';

// Bundle 标识提取
export { getBundleId } from './utils';

// 文件名解析
export { parseFilename, buildTargetFilename, getExtension } from './utils';
export type { IpaInfo } from './utils';

// 路径解析
export { expandHome, resolvePath, parsePath } from './utils';
export type { PathInfo } from './utils';

// 文件系统操作
export { findIpaFiles, copyFile, moveFile, ensureDir, assertDirectory, assertFile, removeEmptyDirs } from './utils';
export type { FileEntry, FileOperationOptions } from './utils';

// 文件信息解析
export { parseFile } from './utils';
export type { FileInfo, ParseFileOptions } from './utils';

// 日志与错误处理
export { logger, setLogLevel, getLogLevel, toErrorMessage, hasErrorCode } from './utils';
export type { LogLevel, Logger } from './utils';

/**
 * 使用示例：
 *
 * ```typescript
 * import { classifyIpaFiles, parseFile, setLogLevel } from '@ipa/cli';
 *
 * setLogLevel('verbose');
 *
 * // 程序化调用分类整理
 * await classifyIpaFiles({
 *   directory: '/path/to/ipa/files',
 *   dryRun: false,
 * });
 *
 * // 解析单个文件路径的关联信息
 * const info = parseFile('~/path/to/some/dir/微信 8.0.33.ipa');
 * console.log(info.appName);  // "微信"
 * console.log(info.version);  // "8.0.33"
 * ```
 */
