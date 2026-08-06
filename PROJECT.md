# IPA CLI - 项目说明

## 项目概述

IPA CLI 是一个用于自动整理和分类 iOS `.ipa` 应用安装包文件的命令行工具，基于 TypeScript 实现，提供 `classify`（按应用名分类整理）与 `bundle`（重命名为带 Bundle ID 的文件名）两个命令。

## 目录结构

```
├── src/                    # TypeScript 源码
│   ├── bin/
│   │   └── cli.ts          # CLI 入口文件
│   ├── commands/
│   │   ├── classify.ts     # classify 命令 CLI 接线
│   │   ├── bundle.ts       # bundle 命令 CLI 接线
│   │   └── index.ts        # 命令导出
│   ├── core/
│   │   ├── classifier.ts   # 分类整理核心业务（与 CLI 解耦）
│   │   └── bundler.ts      # Bundle 重命名核心业务（与 CLI 解耦）
│   ├── utils/              # 工具模块
│   │   ├── filename.ts     # 文件名解析
│   │   ├── file.ts         # 异步文件系统操作
│   │   ├── bundle.ts       # Bundle ID 提取（adm-zip + plist）
│   │   ├── path.ts         # 路径解析
│   │   ├── parse.ts        # 文件信息解析（路径 + 文件名信息）
│   │   ├── logger.ts       # 分级日志
│   │   ├── errors.ts       # 错误处理工具
│   │   └── index.ts        # 工具导出与终端图标
│   └── index.ts            # 程序化接口
├── dist/                   # 构建产物（tsc 输出，含类型声明）
├── tests/                  # 测试用例
│   ├── modules/            # 模块测试（node:test，与 src 模块一一对应）
│   ├── cli/                # CLI 测试（运行构建产物 dist/bin/cli.js）
│   └── prepare.sh          # 示例 IPA 文件名生成脚本
├── docs/
│   ├── REQUIREMENTS.md     # 详细需求文档
│   └── skills/project-overview/  # 项目实现总览 skill
├── tsconfig.json           # TypeScript 配置
├── package.json            # 项目配置
└── README.md               # 项目文档
```

## 命令使用

### 全局安装后使用

```bash
# 安装
npm install -g .

# 使用
ipa classify
ipa classify -d /path/to/dir
ipa classify --dry-run

# bundle：重命名为 <原文件名>@<BundleID>.ipa
ipa bundle -d /path/to/ipa/files
ipa bundle -f /path/to/微信 8.0.33.ipa
ipa bundle -d /path/to/ipa/files --dry-run
```

### 本地开发

```bash
npm install
npm run build

# 测试
node dist/bin/cli.js classify --help
node dist/bin/cli.js classify --dry-run
npm run test:module   # 模块单元测试
npm run test:cli      # CLI 集成测试
```

## 技术栈

- **Node.js** >= 22.0.0
- **TypeScript** 5.x - 类型支持与构建
- **Commander.js** - CLI 框架
- **Chalk** - 终端颜色

## 架构设计

### 模块化设计

项目采用模块化架构，遵循单一职责原则：

- **commands/** - 每个命令独立模块，仅负责 CLI 接线
- **core/** - 与 CLI 解耦的核心业务（`classifier.ts`）
- **utils/** - 可复用的工具函数，按职责细分：
  - `filename.ts` - 文件名解析与目标文件名生成
  - `file.ts` - 异步文件系统操作（扫描/复制/移动/校验/清理）
  - `bundle.ts` - Bundle ID 提取（adm-zip + plist）
  - `path.ts` - 路径解析（`~` 展开、绝对/相对路径）
  - `parse.ts` - 文件信息解析，组合路径与文件名信息
  - `logger.ts` - 分级日志输出（silent/error/warn/info/verbose）
  - `errors.ts` - 错误处理工具
- **bin/** - CLI 入口，负责注册命令
- **index.ts** - 程序化 API

### 构建

```bash
npm run build       # tsc 编译 src → dist
npm run dev         # tsc --watch：监听 src 变更自动构建到 dist
npm run typecheck   # 类型检查
npm run link        # 构建并全局链接（npm link），开发后可全局使用 ipa 命令测试
```

### 测试

测试使用 Node.js 内置 `node:test`，无第三方测试依赖；测试文件与源码模块一一对应，运行前自动构建（`tsc`）。

```bash
npm run test:module   # 模块测试（tests/modules/*.test.js，含根目录与多层嵌套目录场景）
npm run test:cli      # CLI 测试（tests/cli/*.test.js，临时目录生成 ipa 文件后运行 dist/bin/cli.js）
```

### 扩展新命令

添加新命令只需三步：

1. 在 `src/commands/` 创建新命令文件
2. 实现 `registerCommand()` 函数
3. 在 `src/bin/cli.ts` 中注册

示例：
```typescript
// src/commands/newcommand.ts
import type { Command } from 'commander';

function registerCommand(program: Command) {
  program
    .command('newcommand')
    .description('新命令')
    .action(() => {
      // 命令逻辑
    });
}

export { registerCommand };
```

## 依赖说明

- 运行时依赖：`commander`、`chalk`、`adm-zip`、`plist`
- 开发依赖：`typescript`、`@types/node`、`@types/plist`

详见 README.md。

## 许可证

MIT
