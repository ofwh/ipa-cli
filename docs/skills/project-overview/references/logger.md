# Module: src/utils/logger.ts + src/utils/errors.ts — 日志与错误处理

## 职责

统一日志输出通道（替代散落在各模块中的 `console.log`/`console.error`）与错误处理工具。

## 导出（logger.ts）

- 类型：`LogLevel`（`'silent' | 'error' | 'warn' | 'info' | 'verbose'`）、`Logger`
- `setLogLevel(level)`：设置全局日志级别
- `getLogLevel()`：获取当前级别
- `logger`：全局日志实例

## Logger 接口

| 方法 | 级别门槛 | 颜色 | 输出 |
| --- | --- | --- | --- |
| `error(msg)` | error | 红 | stderr |
| `warn(msg)` | warn | 黄 | stderr |
| `info(msg)` | info | 默认 | stdout |
| `success(msg)` | info | 绿 | stdout |
| `verbose(msg)` | verbose | 灰 | stdout |

## 级别优先级

`silent(0) < error(1) < warn(2) < info(3) < verbose(4)`；当前级别低于或等于消息级别门槛时才输出（如 `info` 级别下 `verbose` 消息被抑制）。

## 导出（errors.ts）

- `toErrorMessage(error)`：将未知错误统一转为字符串（`Error` 取 `.message`，其他 `String()`）。
- `hasErrorCode(error, code)`：判断错误是否携带指定 Node.js 错误码（如 `EXDEV`）。

## 调用关系

- `file.ts`（扫描/清理警告）、`core/classifier.ts`（全部流程输出）、`commands/classify.ts`（错误与耗时）均通过 `logger` 输出。
- `toErrorMessage`/`hasErrorCode` 被 `file.ts` 与 `core/classifier.ts` 使用。

## 注意点

- 消息中可内嵌 `chalk` 样式片段（如 `chalk.cyan(path)`），外层着色不会破坏内层 ANSI 码。
- CLI 层通过 `setLogLevel` 使 `--verbose` 生效；编程调用方也可自行设置级别。
