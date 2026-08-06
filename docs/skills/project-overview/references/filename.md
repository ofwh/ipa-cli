# Module: src/utils/filename.ts — 文件名解析

## 职责

从 IPA 文件名中解析应用名、版本系列、版本号、构建号、时间戳、Bundle ID，并生成移除时间戳后的目标文件名。纯函数模块，无副作用；仅面向 `.ipa` 文件。

## 导出

- `parseFilename(filename)`：解析文件名，成功返回 `IpaInfo`，失败返回 `null`。
- `buildTargetFilename(parsed)`：根据解析结果生成目标文件名。
- `getExtension(filename)`：获取文件扩展名（含前导点），供 `suffix` 字段派生。
- 类型：`IpaInfo`。

## IpaInfo 字段

```typescript
interface IpaInfo {
  filename: string;             // 原始文件名（含扩展名）
  name: string;                 // 不含扩展名的文件名
  suffix: string;               // 扩展名（含前导点），如 ".ipa"
  appName: string;              // 应用名
  version: string;              // 版本号或构建号（不含系列），如 "7.10.2"、"170045"
  series: string | null;        // 版本系列号（可选）
  buildNumber: string | null;   // 构建号（可选，5-13 位数字，上限比 14 位时间戳少一位）
  timestamp: string | null;     // 时间戳（可选，14 位数字）
  bundleId: string | null;      // Bundle ID（可选）
}
```

## parseFilename 解析逻辑

1. 用 `/\.ipa$/i` 去掉扩展名得到 `name`；用 `getExtension` 得到 `suffix`（基于文件名最后一个 `.`，无扩展名返回空字符串）。
2. 依次尝试三种正则模式，命中即返回：

### 模式 1 — 完整格式（从右向左匹配可选部分）

```
^(.+?)\s+(?:(\d+)\s+)?(\d+(?:\.\d+){0,3}|\d{5,6})(?:\s+(\d{5,13}))?(?:\((\d{14})\))?(?:@([\w.\-]+))?$
```

捕获组：

- `$1` 应用名（非贪婪，含空格/中英文/特殊字符）
- `$2` 版本系列号（可选，如 `1Password 7` 中的 `7`）
- `$3` 版本号：`1-4` 段点分版本（如 `8.0.33`）或 5-6 位纯数字（如 `170045`）
- `$4` 构建号（可选，5-13 位数字；上限比 14 位时间戳少一位，不会匹配时间戳内容）
- `$5` 时间戳（可选，14 位数字，如 `20200101000000`）
- `$6` Bundle ID（可选，`[\w.\-]+`，以 `@` 前缀）

### 模式 2 — 简单格式

```
^(.+?)\s+(\d+(?:\.\d+)+)$
```

应用名 + 点分版本号（至少一段点分，如 `1.0`、`8.0.33`）。

### 模式 3 — 纯数字版本

```
^(.+?)\s+(\d{5,6})$
```

应用名 + 5-6 位纯数字（如 `京东 170045.ipa`）。

### 返回对象

- `version` 仅为版本号或构建号（如 `7.10.2`、`170045`），不包含版本系列；系列号单独存放于 `series` 字段。
- 例如 `1Password 7 7.10.2.ipa` → `series: "7"`、`version: "7.10.2"`。
- 所有模式均未命中返回 `null`（该文件将被 classify 流程跳过）。

## buildTargetFilename 生成规则

```
[应用名] [系列号] 版本号 [构建号] [@BundleID] + suffix
```

- 基础：`appName`；有 `series` 时并入（如 `1Password 7`）；再拼接 `version`。
- 有构建号：追加 `' ' + buildNumber`。
- 有 Bundle ID：末尾追加 `'@' + bundleId`（无空格）。
- 末尾拼接 `suffix`（如 `.ipa`，保留原始大小写）。
- 时间戳不参与目标文件名（即被移除）。

示例：

- `企业微信 5.0.0(20200101000000).ipa` → `企业微信 5.0.0.ipa`
- `京东 11.2.8 168328.ipa` → `京东 11.2.8 168328.ipa`
- `微信 8.0.33@com.tencent.xin.ipa` → `微信 8.0.33@com.tencent.xin.ipa`
- `淘宝 10 10.2.3 168328(20200101000000)@com.taobao.ipa` → `淘宝 10 10.2.3 168328@com.taobao.ipa`

## 注意点

- `version` 不包含系列号；`buildTargetFilename` 会将 `series` 重新并入目标文件名（如 `1Password 7 7.10.2.ipa`）。
- 解析依赖文件名中「应用名与版本之间至少一个空格」；无空格文件名无法解析。
- 构建号/时间戳均限定为纯数字；Bundle ID 只允许 `[\w.\-]`。
- 工具只处理 `.ipa` 文件，故不包含 `isIPA` 标记；`suffix` 字段保留用于目标文件名拼接等后续处理。
