# Module: src/core/bundler.ts — Bundle 重命名核心业务

## 职责

与 CLI 解耦的纯业务层（类似 `src/core/classifier.ts`）：扫描目录或处理单个文件 → 提取 Bundle ID → 重命名（默认原地；指定 `output` 时输出到目标目录，`keepDir` 保留次级目录结构）→ dry-run 预览 / 实际执行 → 统计。所有输出经由 `logger`，受日志级别控制。

## 导出

- `bundleIpaFiles(options): Promise<BundleStats>`：执行 Bundle 重命名流程（可编程调用）。
- 类型：`BundleOptions`、`BundleStats`。

## BundleOptions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `directory` | `string` | 待处理目录（与 `file` 二选一，递归扫描 `.ipa`） |
| `file` | `string` | 单个 IPA 文件（与 `directory` 二选一） |
| `output` | `string` | 输出目录（未提供时原地重命名） |
| `keepDir` | `boolean` | 输出时保留输入目录下的次级目录结构（仅 `output` 模式下生效） |
| `dryRun` | `boolean` | 模拟运行（不执行任何 IO） |

## BundleStats

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `scanned` | `number` | 扫描到的 IPA 文件总数 |
| `renamed` | `number` | 成功重命名的文件数 |
| `skipped` | `number` | 跳过的文件数（未找到 Bundle ID 或已带 Bundle 命名） |
| `failed` | `number` | 失败的文件数（IO 错误） |

## 处理流程

1. 收集待处理文件：文件模式直接使用 `options.file`；目录模式调用 `findIpaFiles()`（异步并行递归扫描，来自 `src/utils/file.ts`）。
2. 对每个文件调用 `getBundleId()`（`src/utils/bundle.ts`，内部使用 `adm-zip` + `plist`）读取 `Payload/<App>.app/Info.plist` 的 `CFBundleIdentifier`。
3. 无 Bundle ID → 跳过并警告。
4. 目标文件名：`<不含扩展名的文件名>@<BundleID>.ipa`（参考 `src/utils/bundle.ts`）；文件名已带相同 Bundle ID（如 `QQ 8.9.88@com.tencent.qq.ipa`）时目标名保持不变。
5. 目标路径：未指定 `output` 时原地重命名（源文件所在目录）；指定 `output` 时输出到该目录，`keepDir` 时按 `path.relative(directory, 源文件目录)` 创建次级目录结构（如 `-d ./dir1` 处理 `./dir1/dir2/dir3/file.ipa` → `output/dir2/dir3/file@BundleID.ipa`），否则平铺到输出根目录。
6. 原地模式且已带相同 Bundle ID → 无操作，按 `(skip)` / `(skipped)` 标签展示（与 classify 的 overwrite 标签风格一致）；输出模式则仅移动不改名。
7. dry-run 仅展示将执行的操作（目标路径相对输出目录展示）；实际执行调用 `moveFile()`（`src/utils/file.ts`），目标已存在时展示 `overwrite` 标签。
8. 输出统计汇总并返回 `BundleStats`。

## 调用关系

- 依赖：`src/utils/bundle.ts`（Bundle ID 提取）、`src/utils/file.ts`（扫描/移动）、`src/utils/logger.ts`、`src/utils/errors.ts`。
- 被 `src/commands/bundle.ts`（CLI 层）与 `src/index.ts`（程序化 API）消费。
