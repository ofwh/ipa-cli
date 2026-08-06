# Module: src/utils/parse.ts — 文件信息解析

## 职责

将「相对/完整路径的 IPA 文件名」（如 `~/path/to/some/dir/微信 8.0.33.ipa`）解析为关联信息 JSON：包含相对/绝对目录与路径、文件名解析信息（`filename`/`name`/`suffix`/`appName`/`version` 等）与目标文件名。组合 `path.ts`（`parsePath`）与 `filename.ts`（`parseFilename`/`buildTargetFilename`）。仅面向 `.ipa` 文件，不包含 `isIPA`/`input` 字段。

## 导出

- `parseFile(input, options?)` → FileInfo | null
- 类型：`FileInfo`、`ParseFileOptions`

## FileInfo 字段（扁平 JSON）

```typescript
interface FileInfo {
  // 路径信息（来自 parsePath）
  absolutePath: string;   // 绝对路径（含文件名）
  absoluteDir: string;    // 绝对目录
  relativePath: string;   // 相对路径（相对 baseDir）
  relativeDir: string;    // 相对目录

  // 文件名解析信息（来自 parseFilename）
  filename: string;       // 文件名（含扩展名），如 "微信 8.0.33.ipa"
  name: string;           // 不含扩展名的文件名
  suffix: string;         // 扩展名（含前导点），如 ".ipa"
  appName: string;        // 应用名
  version: string;        // 版本号或构建号（不含系列）
  series: string | null;  // 版本系列号
  buildNumber: string | null;    // 构建号
  timestamp: string | null;      // 时间戳
  bundleId: string | null;       // Bundle ID

  // 衍生信息
  targetFilename: string;  // 去除时间戳后的目标文件名（suffix 拼接）
}
```

## parseFile 行为

1. `baseDir = options.baseDir ?? process.cwd()`。
2. `parsePath(input, baseDir)` 得到路径信息；`path.basename(absolutePath)` 取文件名。
3. `parseFilename(filename)` 解析 IPA 字段；解析成功返回 `FileInfo`（含 `buildTargetFilename` 生成的目标文件名）。
4. 文件名不符合 IPA 命名格式（或非 `.ipa`）时返回 `null`。

## 示例

```typescript
const info = parseFile('~/path/to/some/dir/微信 8.0.33.ipa');
// {
//   absolutePath: '/Users/xxx/path/to/some/dir/微信 8.0.33.ipa',
//   absoluteDir: '/Users/xxx/path/to/some/dir',
//   relativePath: 'path/to/some/dir/微信 8.0.33.ipa',
//   relativeDir: 'path/to/some/dir',
//   filename: '微信 8.0.33.ipa',
//   name: '微信 8.0.33',
//   suffix: '.ipa',
//   appName: '微信',
//   version: '8.0.33',
//   series: null,
//   buildNumber: null,
//   timestamp: null,
//   bundleId: null,
//   targetFilename: '微信 8.0.33.ipa',
// }
```

## 注意点

- `classifyIpaFiles` 依赖本模块：`null` 表示跳过该文件；非空时读取 `appName`/`version`/`timestamp`/`targetFilename`。
- `filename` 即原始文件名（含扩展名）；`name` 为去掉扩展名的部分；`suffix` 保留用于目标文件名拼接等后续处理。
- `relativePath`/`relativeDir` 以 `baseDir`（默认 cwd）为基准。
