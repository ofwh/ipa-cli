# Module: src/commands/index.ts — 命令统一导出

## 职责

命令模块的统一出口，聚合 CLI 接线与核心业务（classify + bundle）。

## 关键实现

- 从 `./classify` 引入 `registerCommand`（CLI 层），并从 `../core/classifier` 引入 `classifyIpaFiles`（业务层）。
- 从 `./bundle` 引入 `registerCommand`（CLI 层），并从 `../core/bundler` 引入 `bundleIpaFiles`（业务层）。
- 导出 `classifyCommand` 对象：`{ registerCommand, classifyIpaFiles }`。
- 导出 `bundleCommand` 对象：`{ registerCommand, bundleIpaFiles }`。
- 同时具名导出 `registerCommand`、`classifyIpaFiles`、`registerBundleCommand`、`bundleIpaFiles` 与类型 `ClassifyOptions`、`ClassifyStats`、`BundleOptions`、`BundleStats`。

## 导出

- `classifyCommand`：`{ registerCommand, classifyIpaFiles }`
- `bundleCommand`：`{ registerCommand, bundleIpaFiles }`
- `registerCommand(program)`：向 Commander 注册 `classify` 子命令
- `classifyIpaFiles(options)`：分类整理核心业务（可编程调用）
- `registerBundleCommand(program)`：向 Commander 注册 `bundle` 子命令
- `bundleIpaFiles(options)`：Bundle 重命名核心业务（可编程调用）
- 类型：`ClassifyOptions`、`ClassifyStats`
- 类型：`BundleOptions`、`BundleStats`

## 扩展方式

新增命令时在 `src/commands/` 下新建文件并实现 `registerCommand(program)`，在此文件追加导出，再到 `src/bin/cli.ts` 调用其 `registerCommand`。

## 调用关系

- 被 `src/bin/cli.ts`（`classifyCommand.registerCommand(program)` / `bundleCommand.registerCommand(program)`）与 `src/index.ts`（`classifyIpaFiles` / `bundleIpaFiles`）消费。
