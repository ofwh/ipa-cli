# Module: src/index.ts — 程序化 API

## 职责

提供面向 Node.js 脚本的程序化接口（TypeScript，编译后带 `.d.ts` 类型声明），将业务层与工具层的核心能力统一导出，无需经过 CLI。

## 关键实现

- 从 `./core/classifier` 导出 `classifyIpaFiles` 及类型 `ClassifyOptions`、`ClassifyStats`。
- 从 `./core/bundler` 导出 `bundleIpaFiles` 及类型 `BundleOptions`、`BundleStats`。
- 从 `./commands` 导出 `classifyCommand`、`bundleCommand`。
- 从 `./utils` 导出：
  - 文件名解析：`parseFilename`、`buildTargetFilename`、`getExtension`
  - 路径解析：`expandHome`、`resolvePath`、`parsePath`
  - 文件系统操作：`findIpaFiles`、`copyFile`、`moveFile`、`ensureDir`、`assertDirectory`、`assertFile`、`removeEmptyDirs`
  - Bundle 标识提取：`getBundleId`
  - 文件信息解析：`parseFile`
  - 日志与错误：`logger`、`setLogLevel`、`getLogLevel`、`toErrorMessage`、`hasErrorCode`
  - 对应全部类型

## 导出的 API

| 导出 | 来源 | 用途 |
| --- | --- | --- |
| `classifyIpaFiles(options)` | `src/core/classifier.ts` | 执行一次完整分类整理流程 |
| `bundleIpaFiles(options)` | `src/core/bundler.ts` | 将 IPA 文件重命名为 `<名>@<BundleID>.ipa` |
| `parseFile(input, options?)` | `src/utils/parse.ts` | 解析文件路径 → 关联信息 JSON（非 IPA 返回 null） |
| `parseFilename(filename)` | `src/utils/filename.ts` | 解析 IPA 文件名 |
| `getExtension(filename)` | `src/utils/filename.ts` | 获取文件扩展名（含前导点） |
| `buildTargetFilename(parsed)` | `src/utils/filename.ts` | 生成去时间戳目标文件名 |
| `expandHome / resolvePath / parsePath` | `src/utils/path.ts` | 路径解析 |
| `findIpaFiles / copyFile / moveFile / ensureDir / assertDirectory / assertFile / removeEmptyDirs` | `src/utils/file.ts` | 文件系统操作（异步） |
| `getBundleId(ipaPath)` | `src/utils/bundle.ts` | 从 IPA 提取 Bundle ID（adm-zip + plist） |
| `logger / setLogLevel / getLogLevel` | `src/utils/logger.ts` | 分级日志 |
| `toErrorMessage / hasErrorCode` | `src/utils/errors.ts` | 错误处理 |

## 调用示例

```typescript
import { classifyIpaFiles, bundleIpaFiles, parseFile, setLogLevel } from '@ipa/cli';

setLogLevel('verbose');

await classifyIpaFiles({
  directory: '/path/to/ipa/files',
  dryRun: false,
});

// Bundle 重命名（单文件）
await bundleIpaFiles({ file: '/path/to/微信 8.0.33.ipa' });

const info = parseFile('~/path/to/some/dir/微信 8.0.33.ipa');
console.log(info.absolutePath); // "/Users/xxx/path/to/some/dir/微信 8.0.33.ipa"
console.log(info.appName);      // "微信"
console.log(info.version);      // "8.0.33"
```

## 注意点

- `package.json` 的 `exports` 字段同时暴露 `./commands`（`dist/commands/index.js`）与 `./utils`（`dist/utils/index.js`）子路径，均带 `types` 条件。
- `classifyIpaFiles` 返回 `ClassifyStats`（见 `classifier.md`）、`bundleIpaFiles` 返回 `BundleStats`（见 `bundler.md`）；文件操作均为异步。
