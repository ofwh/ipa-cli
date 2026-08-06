# Module: src/commands/bundle.ts — bundle 命令（CLI 层）

## 职责

仅负责命令行接线，不包含业务逻辑（业务在 `src/core/bundler.ts`）：选项解析（`-d` 目录 / `-f` 文件二选一、`-o` 输出目录）、`~`/相对路径解析、日志级别设置、路径与扩展名校验、耗时统计与错误处理。

## 导出

- `registerCommand(program)`：向 Commander 注册 `bundle` 子命令。

## CLI 选项

| 选项 | 简写 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--directory <path>` | `-d` | - | 待处理目录（递归扫描目录下全部 `.ipa`，支持绝对/相对/`~` 开头路径） |
| `--file <path>` | `-f` | - | 单个 IPA 文件 |
| `--output <directory>` | `-o` | - | 输出目录（提供时统一输出到该目录；未提供则原地重命名） |
| `--keep-dir [value]` | - | `false` | 输出时保留输入目录下的次级目录结构（仅 `-o` 模式下生效，支持 `--keep-dir` / `--keep-dir=true`） |
| `--dry-run` | - | `false` | 模拟运行 |
| `--verbose` | `-v` | `false` | 详细日志（verbose 级别） |

## action 处理流程

1. `setLogLevel(verbose ? 'verbose' : 'info')`（来自 `src/utils/logger.ts`）。
2. 校验 `-d` 与 `-f` 必须二选一（都缺或都填都报错）。
3. `resolvePath()` 解析为绝对路径（支持 `~` 展开，来自 `src/utils/path.ts`）：
   - 目录模式：`assertDirectory(directory)` 校验目录（来自 `src/utils/file.ts`）。
   - 文件模式：`assertFile(file)` 校验文件存在，`getExtension()` 校验扩展名为 `.ipa`。
   - `-o` 提供时同样 `resolvePath` 解析为绝对路径；`--keep-dir` 归一化（`true`/`'true'` 均视为开启）。
4. 调用 `bundleIpaFiles({ directory | file, output?, keepDir?, dryRun })`，非 dry-run 时打印 `Duration: X.XXs`。
5. 异常时 `logger.error` 输出（verbose 时附带堆栈）并 `process.exit(1)`。

## 注意点

- 本模块不直接调用文件/解析工具，业务逻辑全部委托给 `src/core/bundler.ts`。
- `process.exit(1)` 仅存在于 CLI 层；编程调用 `bundleIpaFiles` 时通过异常/返回值处理。
- 未指定 `-o` 时目标文件原地重命名（同一目录）；指定 `-o` 时输出到目标目录，`--keep-dir` 保留输入目录下的次级目录结构（如 `-d ./dir1` 处理 `./dir1/dir2/dir3/file.ipa` → `-o/dir2/dir3/file@BundleID.ipa`）。文件名规则参考 `src/utils/bundle.ts`：`<原文件名>@<BundleID>.ipa`。
