# Module: src/commands/classify.ts — classify 命令（CLI 层）

## 职责

仅负责命令行接线，不包含业务逻辑（业务在 `src/core/classifier.ts`）：选项解析、`~`/相对路径解析、日志级别设置、目录校验、耗时统计与错误处理。

## 导出

- `registerCommand(program)`：向 Commander 注册 `classify` 子命令。

## CLI 选项

| 选项 | 简写 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--directory <path>` | `-d` | `process.cwd()` | 处理目录（支持绝对/相对/`~` 开头路径） |
| `--output <directory>` | `-o` | `'Versions'` | 输出目录 |
| `--copy` | `-c` | `false` | 复制而非移动 |
| `--dry-run` | - | `false` | 模拟运行 |
| `--verbose` | `-v` | `false` | 详细日志（verbose 级别） |

## action 处理流程

1. `resolvePath(directory ?? process.cwd())` 与 `resolvePath(output ?? 'Versions')` 解析为绝对路径（支持 `~` 展开，来自 `src/utils/path.ts`）。
2. `setLogLevel(verbose ? 'verbose' : 'info')`（来自 `src/utils/logger.ts`）——`--verbose` 真正生效。
3. `await assertDirectory(directory)` 校验目录。
4. 调用 `classifyIpaFiles({ directory, output, copy, dryRun })`，非 dry-run 时打印 `Duration: X.XXs`。
5. 异常时 `logger.error` 输出（verbose 时附带堆栈）并 `process.exit(1)`。

## 注意点

- 本模块不直接调用文件/解析工具，业务逻辑全部委托给 `src/core/classifier.ts`。
- `process.exit(1)` 仅存在于 CLI 层；编程调用 `classifyIpaFiles` 时通过异常/返回值处理。
