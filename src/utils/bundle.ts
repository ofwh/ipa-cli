/**
 * IPA Bundle 标识提取模块
 *
 * 从 `.ipa` 文件（ZIP 容器）中读取 `Payload/<App>.app/Info.plist`，
 * 解析 `CFBundleIdentifier` 得到 Bundle ID。纯函数模块，无副作用。
 */

import AdmZip from 'adm-zip';
import * as plist from 'plist';

/** 目标 plist 条目路径格式：Payload/xxxxx.app/Info.plist */
const INFO_PLIST_PATTERN = /^Payload\/[^/]+\.app\/Info\.plist$/;

/**
 * 获取 IPA 文件的 Bundle ID（CFBundleIdentifier）
 *
 * 遍历 ZIP 条目，查找 `Payload/xxxxx.app/Info.plist` 并解析其
 * `CFBundleIdentifier`；读取或解析失败时返回 null（由调用方按跳过处理）。
 *
 * @param ipaPath IPA 文件路径
 * @returns Bundle ID（如 `com.tencent.xin`）；未找到时返回 null
 */
export function getBundleId(ipaPath: string): string | null {
  let zip: AdmZip;
  try {
    zip = new AdmZip(ipaPath);
  } catch {
    return null;
  }

  for (const entry of zip.getEntries()) {
    if (!INFO_PLIST_PATTERN.test(entry.entryName)) {
      continue;
    }

    try {
      const content = entry.getData().toString('utf-8');
      const xml = plist.parse(content);
      const bundleId =
        typeof xml === 'object' && xml !== null && !Array.isArray(xml)
          ? (xml as Record<string, unknown>).CFBundleIdentifier
          : undefined;

      if (typeof bundleId === 'string' && bundleId) {
        return bundleId;
      }
    } catch {
      // 单个条目解析失败时继续查找其他 Info.plist
    }
  }

  return null;
}
