/**
 * IPA 文件名解析模块
 *
 * 从 IPA 文件名中解析应用名、版本系列、版本号、构建号、时间戳、
 * Bundle ID 等信息，并生成去除时间戳后的目标文件名。
 * 纯函数模块，无副作用；仅面向 .ipa 文件。
 */

/** IPA 文件名解析结果 */
export interface IpaInfo {
  /** 原始文件名（含扩展名），如 `微信 8.0.33.ipa` */
  filename: string;
  /** 不含扩展名的文件名，如 `微信 8.0.33` */
  name: string;
  /** 文件扩展名（含前导点），如 `.ipa`（可用于目标文件名拼接等后续处理） */
  suffix: string;
  /** 应用名 */
  appName: string;
  /** 版本号或构建号（不含版本系列），如 `7.10.2`、`170045` */
  version: string;
  /** 版本系列号（可选），如 `1Password 7` 中的 `7`（目标文件名拼接时重新并入） */
  series: string | null;
  /** 构建号（可选，5-13 位数字，最多比 14 位时间戳少一位，不会匹配时间戳内容） */
  buildNumber: string | null;
  /** 时间戳（可选，14 位数字，如 `20200101000000`） */
  timestamp: string | null;
  /** Bundle ID（可选，如 `com.tencent.xin`） */
  bundleId: string | null;
}

const EXTENSION_REGEX = /\.ipa$/i;

/**
 * 获取文件扩展名（含前导点）
 * @param filename 文件名
 * @returns 扩展名，如 `.ipa`；无扩展名时返回空字符串
 */
export function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(dotIndex) : '';
}

/**
 * 文件名解析模式（按优先级依次尝试，命中即返回）
 *
 * 模式 1 - 完整格式（从右向左匹配可选部分）：
 *   AppName [Series] Version [BuildNumber] [(Timestamp)] [@BundleID]
 *   捕获组：$1 应用名 / $2 版本系列 / $3 版本号 / $4 构建号 / $5 时间戳 / $6 Bundle ID
 *
 * 构建号：5-13 位数字（上限比 14 位时间戳少一位，避免匹配到时间戳内容）。
 */
const FULL_PATTERN =
  /^(.+?)\s+(?:(\d+)\s+)?(\d+(?:\.\d+){0,3}|\d{5,6})(?:\s+(\d{5,13}))?(?:\((\d{14})\))?(?:@([\w.\-]+))?$/;

/** 模式 2 - 简单格式：AppName Version */
const SIMPLE_PATTERN = /^(.+?)\s+(\d+(?:\.\d+)+)$/;

/** 模式 3 - 纯数字版本：AppName Number(5-6 位) */
const NUMERIC_PATTERN = /^(.+?)\s+(\d{5,6})$/;

const PATTERNS: RegExp[] = [FULL_PATTERN, SIMPLE_PATTERN, NUMERIC_PATTERN];

/**
 * 解析 IPA 文件名
 * @param filename 文件名（含扩展名，如 `微信 8.0.33.ipa`）
 * @returns 解析结果；不符合任何已知格式时返回 null
 */
export function parseFilename(filename: string): IpaInfo | null {
  const name = filename.replace(EXTENSION_REGEX, '');
  const suffix = getExtension(filename);

  for (const pattern of PATTERNS) {
    const match = name.match(pattern);
    if (!match) {
      continue;
    }

    return {
      filename,
      name,
      suffix,
      appName: match[1].trim(),
      version: match[3],
      series: match[2] ?? null,
      buildNumber: match[4] ?? null,
      timestamp: match[5] ?? null,
      bundleId: match[6] ?? null,
    };
  }

  return null;
}

/**
 * 生成目标文件名（去除时间戳）
 *
 * 组合规则：`AppName [Series] Version [BuildNumber] [@BundleID]` + suffix
 * @param parsed 解析结果
 * @returns 目标文件名
 */
export function buildTargetFilename(parsed: IpaInfo): string {
  const parts = [parsed.appName];
  if (parsed.series) {
    parts.push(parsed.series);
  }
  parts.push(parsed.version);
  if (parsed.buildNumber) {
    parts.push(parsed.buildNumber);
  }

  let target = parts.join(' ');
  if (parsed.bundleId) {
    target += `@${parsed.bundleId}`;
  }

  return target + parsed.suffix;
}
