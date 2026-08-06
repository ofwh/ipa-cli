---
name: project-overview
description: Overview skill for the @ipa/cli project (IPA 文件自动分类整理工具). Use this when a task needs project implementation context — architecture, module behavior, CLI flow, filename/path/file parsing rules, or file operations — before coding, reviewing, or updating documentation. Load only the relevant module reference files under references/.
---

# Project Overview

基于 TypeScript 的 Node.js 命令行工具，用于整理 iOS `.ipa` 安装包文件，提供两个子命令：

- `classify`：按应用名自动扫描、分类和整理：扫描目录（异步并行递归）→ 解析文件路径信息（`parseFile`）→ 按应用名分组移动到 `<output>/<AppName>/` → 移除文件名中的时间戳 → 清理空目录。
- `bundle`：读取 IPA 内 `Payload/<App>.app/Info.plist` 的 `CFBundleIdentifier`（`adm-zip` + `plist`），将文件重命名为 `<原文件名>@<BundleID>.ipa`（参考 `src/utils/bundle.ts`），支持 `-d` 目录递归或 `-f` 单文件；默认原地重命名，`-o` 指定输出目录统一输出（`--keep-dir` 保留输入目录下的次级目录结构）。

技术栈：Node.js >= 22、TypeScript 5.x（`src/` 源码 → `dist/` 构建产物）、`commander`（CLI 参数解析）、`chalk`（终端着色）、`adm-zip` + `plist`（Bundle ID 提取）。

## 架构

分层架构，职责清晰：

- **入口层**：`src/bin/cli.ts`（命令行入口，版本号从 package.json 读取）、`src/index.ts`（程序化 API）。
- **命令层**：`src/commands/` — `classify.ts` / `bundle.ts` 仅负责 CLI 接线（选项解析、日志级别、路径校验、耗时），`index.ts` 统一导出。
- **业务层**：`src/core/classifier.ts`（分类整理，`classifyIpaFiles`）与 `src/core/bundler.ts`（Bundle 重命名，`bundleIpaFiles`）— 与 CLI 解耦，可独立测试与编程调用。
- **工具层**：`src/utils/` — 按职责细分：
  - `filename.ts`：文件名解析（三种正则模式）与目标文件名生成
  - `file.ts`：异步文件系统操作（并行递归扫描/复制/移动/校验/空目录清理）
  - `bundle.ts`：Bundle ID 提取（`getBundleId`，内部使用 `adm-zip` + `plist`）
  - `path.ts`：路径解析（`~` 展开、绝对/相对路径拆分）
  - `parse.ts`：文件信息解析，组合 path + filename，返回关联信息 JSON
  - `logger.ts`：分级日志（silent/error/warn/info/verbose），统一输出通道
  - `errors.ts`：错误处理工具
  - `index.ts`：统一导出

## 数据流

1. `src/bin/cli.ts` 读取 package.json 版本号，解析参数后通过 `classifyCommand.registerCommand` / `bundleCommand.registerCommand` 注册子命令。
2. 命令层用 `resolvePath` 展开 `~`/相对路径为绝对路径，按 `--verbose` 设置日志级别，`assertDirectory` 校验目录。
3. `classifyIpaFiles()`（`src/core/classifier.ts`）调用 `findIpaFiles()` 异步并行递归扫描。
4. `parseFile()`（`src/utils/parse.ts`，内部组合 `parsePath` + `parseFilename`）解析每个文件的关联信息：`absolutePath/absoluteDir`、`relativePath/relativeDir`、`filename/appName/version/...`、`targetFilename`；文件名不符合 IPA 格式的返回 null 并被跳过。
5. 目标路径为 `<output>/<AppName>/<targetFilename>`，`willOverwrite` 通过 `fs.existsSync` 判断。
6. `--dry-run` 只打印将执行的操作；否则按 `--copy`/默认移动模式调用异步 `copyFile()`/`moveFile()`。
7. 移动模式下执行完成后调用 `removeEmptyDirs()` 清理源目录中的空目录，最后输出统计。

### bundle 命令数据流

1. `src/bin/cli.ts` 解析参数后调用 `bundleCommand.registerCommand`（`src/commands/bundle.ts`）。
2. 命令层校验 `-d`（目录）与 `-f`（文件）二选一，`resolvePath` 展开 `~`/相对路径，目录模式 `assertDirectory`、文件模式 `assertFile` + `.ipa` 扩展名校验。
3. `bundleIpaFiles()`（`src/core/bundler.ts`）：文件模式直接处理单个文件；目录模式调用 `findIpaFiles()` 递归扫描。
4. 每个文件经 `getBundleId()`（`src/utils/bundle.ts`）读取 `Payload/<App>.app/Info.plist` 的 `CFBundleIdentifier`。
5. 无 Bundle ID 的文件跳过；目标名 `<原文件名>@<BundleID>.ipa`（已带相同 Bundle ID 时保持不变），未指定 `-o` 时原地重命名，指定 `-o` 时输出到目标目录（`--keep-dir` 按输入目录下的相对路径创建次级目录结构，否则平铺）。
6. 原地模式且已带相同 Bundle ID → 无操作按 `(skip)` 展示；`--dry-run` 只打印将执行的操作；否则实际执行（`moveFile`），最后输出统计。

## 测试

- `tests/modules/*.test.js`：模块单元测试，与 `src/` 模块一一对应（`filename`/`parse`/`path`/`file`/`errors`/`logger`/`classify-command`/`classifier`/`bundle-command`/`bundler`/`bundle-util`/`index`/`utils-index`/`commands-index`），覆盖各类 IPA 文件名解析格式、Bundle ID 提取与各工具函数行为。
- `tests/cli/*.test.js`：CLI 集成测试，在临时目录生成示例 ipa 文件（`bundle` 用例用 `adm-zip` + `plist` 生成真实 ZIP 容器）后运行构建产物 `dist/bin/cli.js`，覆盖 `--version`/`--help`、dry-run、verbose、实际执行（移动/去时间戳/清理/跳过）、复制模式、无效目录、`~` 路径，以及 bundle 的 `-d`/`-f`/参数缺失/参数冲突等场景；处理目录覆盖 CLI 根目录（`-d .`）与多层嵌套子目录。
- 测试基于 Node.js 内置 `node:test`（无第三方依赖）；`npm run test:module` / `npm run test:cli` 会先执行 `tsc` 构建，因此测试引用的是 `dist/` 产物。

## Reference map

- `references/cli-entry.md`
  - `src/bin/cli.ts`：命令行入口，版本号读取、program 配置、命令注册、默认帮助行为。
- `references/command-registry.md`
  - `src/commands/index.ts`：命令模块统一导出（`classifyCommand` / `bundleCommand`）。
- `references/classify-command.md`
  - `src/commands/classify.ts`：CLI 接线（选项、日志级别、`~` 路径解析、错误处理）。
- `references/bundle-command.md`
  - `src/commands/bundle.ts`：CLI 接线（`-d` 目录 / `-f` 文件二选一、路径校验、错误处理）。
- `references/classifier.md`
  - `src/core/classifier.ts`：核心业务流程、统计口径、dry-run/执行模式差异（与 CLI 解耦）。
- `references/bundler.md`
  - `src/core/bundler.ts`：Bundle 重命名核心业务流程、统计口径、目标文件名规则。
- `references/programmatic-api.md`
  - `src/index.ts`：程序化 API 导出面与全部类型。
- `references/utils-registry.md`
  - `src/utils/index.ts`：工具函数导出；`src/utils/bundle.ts` 的 `getBundleId`（adm-zip + plist 提取 Bundle ID）。
- `references/logger.md`
  - `src/utils/logger.ts`：分级日志实现与 `src/utils/errors.ts` 错误工具。
- `references/filename.md`
  - `src/utils/filename.ts`：三种正则解析模式、`IpaInfo` 类型、目标文件名生成规则。
- `references/file.md`
  - `src/utils/file.ts`：异步并行递归扫描、复制/移动（含跨文件系统回退）、目录校验、空目录清理。
- `references/path.md`
  - `src/utils/path.ts`：`~` 展开、绝对/相对路径解析、`PathInfo` 类型。
- `references/parse.md`
  - `src/utils/parse.ts`：`parseFile()` 关联信息 JSON 结构（相对/绝对路径 + 文件名解析字段 + 目标文件名；非 IPA 文件名返回 null）。

## Selection guidance

- 需要理解整个 CLI 入口或新增命令 → 读 `references/cli-entry.md`、`references/command-registry.md`、`references/classify-command.md`、`references/bundle-command.md`。
- 修改分类流程、统计口径或输出 → 读 `references/classifier.md`。
- 修改 Bundle 重命名流程、统计口径或目标文件名规则 → 读 `references/bundler.md`。
- 需要以脚本方式调用项目功能 → 读 `references/programmatic-api.md`。
- 修改文件名解析规则或目标文件名生成 → 读 `references/filename.md`。
- 修改文件读写、移动、清理行为 → 读 `references/file.md`。
- 修改路径解析、`~` 展开、相对路径计算 → 读 `references/path.md`。
- 修改 `parseFile` 返回的关联信息 JSON 结构 → 读 `references/parse.md`。
- 修改日志输出、级别或错误处理 → 读 `references/logger.md`。
- 需要终端图标或工具导出清单 → 读 `references/utils-registry.md`。

## 编码约定

- 新增/修改模块时，方法、参数与类型命名须参考已有模块的实现，保持准确且精简：
  - 方法名复用既有动词前缀：`get`/`parse`/`build`/`find`/`copy`/`move`/`ensure`/`assert`/`remove`/`resolve`/`expand`/`to`/`has`/`set`（如 `getExtension`、`getBundleId`、`assertFile`），不要自创项目中没有的动词风格。
  - 核心业务函数遵循 `<动词><名词>` 命名，与命令一一对应（如 `classify` → `classifyIpaFiles`、`bundle` → `bundleIpaFiles`）。
  - 选项/统计类型遵循 `<业务>Options` / `<业务>Stats`（如 `ClassifyOptions`、`BundleStats`），与 `classify.ts`/`bundler.ts` 导出的类型命名一致。
  - 参数名使用语义化短名（`directory`/`file`/`source`/`target`/`input`/`options`），与既有模块保持一致。

## 注意事项

- 文件系统操作全部为异步 API；`--verbose` 会切换日志级别为 `verbose` 并展示每个文件的解析详情。
- `dryRun` 参数会传给 `copyFile`/`moveFile`，这两个函数在 `dryRun` 下直接返回，不执行任何 IO。
- 源码为 TypeScript，改代码后需 `npm run build`（产物在 `dist/`）；`prepare` 钩子会在安装时自动构建；测试同样引用 `dist/` 产物（`test:module`/`test:cli` 已内置构建步骤）。开发时可用 `npm run dev`（`tsc --watch`，监听 `src/` 变更自动生成 `dist/`），`npm run link`（构建 + `npm link`）可全局链接后用 `ipa` 命令测试。
- 版本号从 package.json 读取（`src/bin/cli.ts` 通过 `createRequire`），不要硬编码。
