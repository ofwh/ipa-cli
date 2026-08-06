# Module: src/bin/cli.ts — CLI 入口

## 职责

命令行入口（`#!/usr/bin/env node`，tsc 编译后保留 shebang 输出为 `dist/bin/cli.js`）。负责配置 Commander program、注册 `classify` / `bundle` 子命令、在无参数时展示帮助、解析参数并启动命令。

## 关键实现

- `import { createRequire } from 'module'`，用 `createRequire(__filename)` 读取 `../../package.json` 的 `version`——版本号单一来源，避免硬编码漂移。
- `import { program } from 'commander'`，通过 `../commands` 引入 `classifyCommand` 与 `bundleCommand`。
- 配置 program：
  - `name('ipa')`
  - `description('IPA file classifier - Intelligently parse and classify iOS app packages by name')`
  - `version(pkg.version, '-V, --version', 'Display version number')`
- 调用 `classifyCommand.registerCommand(program)` 注册子命令。
- 调用 `bundleCommand.registerCommand(program)` 注册子命令。
- `process.argv.length === 2`（无任何参数）时调用 `program.help()` 直接展示帮助并退出。
- 最后 `program.parse(process.argv)` 解析命令行参数。

## 导出

无导出（纯入口脚本）。

## 调用关系

- 依赖：`src/commands/index.ts` → `src/commands/classify.ts` 的 `registerCommand`。
- 被调用方：`package.json` 的 `bin.ipa` 指向编译产物 `dist/bin/cli.js`，安装后可通过 `ipa` 命令调用；开发时用 `node dist/bin/cli.js`。

## 边界与注意点

- 无参数时先 `help()` 再 `parse()`，help 内部会 `process.exit`，不会继续执行。
- `-V, --version` 是自定义短选项（Commander 默认 `-V` 即 version），与 `-v, --verbose`（classify 命令内）不冲突。
- 版本号必须通过 package.json 维护，修改 `package.json` 后重建即生效。
- 源码修改后需要重新构建：`npm run build`。
