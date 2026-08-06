# IPA 文件自动分类整理工具

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

🚀 一个基于 **TypeScript** 的 Node.js 命令行工具，用于自动扫描、分类和整理 iOS `.ipa` 应用安装包文件。

## 特性

- **智能解析** - 支持应用名 + 版本号，以及版本系列、构建号、时间戳、Bundle ID 等组合格式
- **自动分类** - 根据应用名自动创建文件夹
- **时间戳处理** - 自动移除文件名中的时间戳
- **精确识别** - 支持中英文、特殊符号、版本号等复杂命名
- **安全可靠** - 支持模拟运行（`--dry-run`），先预览后执行
- **高性能** - 文件扫描/操作全部异步化，子目录并行递归，适配大量文件
- **跨平台** - 支持 macOS、Linux、Windows
- **美观输出** - 使用 chalk 提供优雅的终端界面
- **模块化架构** - TypeScript 实现，完整类型支持，易于扩展
- **文件信息解析** - `parseFile()` 将路径解析为包含相对/绝对路径与文件名信息的 JSON

## 目录

- [系统要求](#系统要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [命令行选项](#命令行选项)
- [支持的文件名格式](#支持的文件名格式)
- [整理效果](#整理效果)
- [处理规则](#处理规则)
- [程序化调用](#程序化调用)
- [开发指南](#开发指南)
- [目录结构](#目录结构)
- [常见问题](#常见问题)
- [许可证](#许可证)

### 系统要求

- Node.js >= 22.0.0
- 支持 macOS、Linux、Windows

### 安装

```bash
# 本地开发
npm install
npm run build

# 全局安装（会自动执行 prepare 构建）
npm install -g .
```

## 快速开始

通过 `npm run link` 命令创建链接方便调试

### 1. 查看帮助信息

```bash
# 查看主帮助
ipa --help

# 查看 classify 命令帮助
ipa classify --help

# 查看 bundle 命令帮助
ipa bundle --help
```

### 2. 模拟运行（推荐首次使用）

```bash
# 在当前目录模拟运行
ipa classify --dry-run

# 在指定目录模拟运行
ipa classify -d /path/to/ipa/files --dry-run
```

### 3. 实际执行

```bash
# 整理当前目录
ipa classify

# 整理指定目录，输出到指定目录
ipa classify -d /path/to/ipa/files -o /path/to/output
```

### 4. 使用 npm scripts

```bash
npm run build       # 构建（tsc 编译 src → dist）
npm run dev         # watch 模式：监听 src 变更自动编译到 dist
npm run typecheck   # 类型检查
npm run test:module # 模块单元测试（tests/modules/，与 src 模块一一对应）
npm run test:cli    # CLI 集成测试（tests/cli/，自动生成临时 ipa 文件）
npm run link        # 构建并全局链接（npm link），之后可直接用 ipa 命令测试
```

## 使用指南

### 示例 1: 整理当前目录

```bash
ipa classify
```

**输出示例：**

```
Scanning directory: ./
Found 1234 .ipa file(s)

Processing files...
  ✓  115 30.0.0.ipa → Versions/115/115 30.0.0.ipa
  ✓  京东 11.2.8 168328.ipa → Versions/京东/京东 11.2.8 168328.ipa
  ✓  企业微信 5.0.0(20200101000000).ipa → Versions/企业微信/企业微信 5.0.0.ipa (renamed)
  ✓  微信 8.0.33@com.tencent.xin.ipa → Versions/微信/微信 8.0.33@com.tencent.xin.ipa

Complete:
   - Files processed: 1234
   - Folders created: 415
   - Files overwritten: 23
   - Files renamed: 156
   - Duration: 2.50s
```

### 示例 2: 指定目录 + 模拟运行

```bash
ipa classify -d ~/Downloads/itunes --dry-run
```

### 示例 3: bundle 重命名（添加 Bundle ID 到文件名）

读取 IPA 内的 `CFBundleIdentifier`（`adm-zip` + `plist`），将文件重命名为 `<原文件名>@<BundleID>.ipa`；默认原地重命名，`-o` 可指定输出目录统一输出。

```bash
# 目录模式：递归处理目录下所有 .ipa
ipa bundle -d /path/to/ipa/files

# 文件模式：只处理单个文件
ipa bundle -f /path/to/微信 8.0.33.ipa

# 输出到指定目录（平铺）
ipa bundle -d /path/to/ipa/files -o /path/to/output

# 输出到指定目录并保留次级目录结构
ipa bundle -d /path/to/ipa/files -o /path/to/output --keep-dir

# 模拟运行
ipa bundle -d /path/to/ipa/files --dry-run
```

**输出示例：**

```
Processing: /path/to/ipa/files
Found 2 .ipa file(s)

Renaming files...
  ✓ 微信 8.0.33.ipa → 微信 8.0.33@com.tencent.xin.ipa
  ✓ QQ 8.9.88.ipa → QQ 8.9.88@com.tencent.qq.ipa

Complete:
   - Files renamed: 2
   - Duration: 0.12s
```

## 命令行选项

| 选项 | 简写 | 描述 | 默认值 |
|-----|------|-----|--------|
| `--directory <path>` | `-d` | 指定要处理的目录路径（支持绝对路径和相对路径） | 当前目录 |
| `--output <directory>` | `-o` | 分类结果的输出目录 | `Versions` |
| `--copy` | `-c` | 复制文件而非移动 | `false` |
| `--dry-run` | - | 模拟运行模式，不执行实际操作 | `false` |
| `--verbose` | `-v` | 显示详细输出信息 | `false` |
| `--help` | `-h` | 显示帮助信息 | - |
| `--version` | `-V` | 显示版本号 | - |

## bundle 命令选项

| 选项 | 简写 | 描述 | 默认值 |
|-----|------|-----|--------|
| `--directory <path>` | `-d` | 处理目录（递归扫描目录下全部 `.ipa` 文件），与 `-f` 二选一 | - |
| `--file <path>` | `-f` | 单个 IPA 文件，与 `-d` 二选一 | - |
| `--output <directory>` | `-o` | 输出目录（提供时统一输出到该目录；未提供则原地重命名） | - |
| `--keep-dir [value]` | - | 输出时保留输入目录下的次级目录结构（仅与 `-o` 配合生效，如 `-d ./dir1` 时 `./dir1/dir2/dir3/file.ipa` → `-o/dir2/dir3/file@BundleID.ipa`） | `false` |
| `--dry-run` | - | 模拟运行模式，不执行重命名 | `false` |
| `--verbose` | `-v` | 显示详细输出信息 | `false` |
| `--help` | `-h` | 显示帮助信息 | - |

> 说明：`-d` 与 `-f` 必须且只能指定一个；未指定 `-o` 时原地重命名，指定 `-o` 时统一输出到目标目录（默认平铺，`--keep-dir` 保留次级目录结构）；目标文件名规则参考 `src/utils/bundle.ts`。

## 支持的文件名格式

工具支持的文件名格式如下（解析逻辑见 `src/utils/filename.ts`，由三种正则模式覆盖）：

基本语法为「应用名 + 版本号」；应用名可含中英文、数字与特殊符号，其后可选拼接版本系列、构建号、时间戳（会被移除）或 Bundle ID（会保留）：

### 基础格式

```
应用名 版本号.ipa
AppName 1.0.0.ipa
115 30.0.0.ipa
```

### 带时间戳（会被移除）

```
企业微信 5.0.0(20200101000000).ipa
→ 移动到: 企业微信/企业微信 5.0.0.ipa
```

### 带 Bundle ID（会保留）

```
微信 8.0.33@com.tencent.xin.ipa
→ 移动到: 微信/微信 8.0.33@com.tencent.xin.ipa
```

### 带构建号（会保留）

```
京东 11.2.8 168328.ipa
→ 移动到: 京东/京东 11.2.8 168328.ipa
```

### 版本系列

```
1Password 7 7.10.2.ipa
→ 移动到: 1Password/1Password 7 7.10.2.ipa
```

### 特殊字符

```
Camera+ 10.39.ipa
Don't Starve 1.47.ipa
Bank of China 9.0.0.ipa
```

### 中文应用名

```
抖音短视频 10.4.0.ipa
中国工商银行 3.0.40.ipa
```

### 复杂组合

```
淘宝 10 10.2.3 168328(20200101000000)@com.taobao.ipa
```

更多格式详见 [需求文档](./docs/REQUIREMENTS.md)。

## 整理效果

### 整理前

```
downloads/
├── 微信 8.0.33.ipa
├── 微信 8.0.32(20200102000000).ipa
├── 京东 11.2.8 168328.ipa
├── 115 30.0.0.ipa
└── QQ 8.9.88@com.tencent.qq.ipa
```

### 整理后

```
downloads/
├── 微信/
│   ├── 微信 8.0.33.ipa
│   └── 微信 8.0.32.ipa  # 时间戳已移除
├── 京东/
│   └── 京东 11.2.8 168328.ipa
├── 115/
│   └── 115 30.0.0.ipa
└── QQ/
    └── QQ 8.9.88@com.tencent.qq.ipa
```

## 处理规则

### 1. 应用名提取

- 从文件名中提取应用名称
- 支持中文、英文、数字、特殊符号
- 保留空格和原始大小写

### 2. 文件夹创建

- 根据应用名创建文件夹
- 文件夹名称 = 应用名
- 如果文件夹已存在，直接使用

### 3. 文件移动

- 保持原始文件名（移除时间戳除外）
- 如果目标位置已存在同名文件，**直接覆盖**
- 支持跨文件系统移动（`EXDEV` 时回退为复制 + 删除）

### 4. 时间戳处理

- 识别格式：`(YYYYMMDDHHmmss)`
- 移动时自动移除
- 其他部分保持不变

### 5. 错误处理

工具会优雅地处理以下错误：

- 目录不存在
- 权限不足
- 磁盘空间不足
- 无法解析的文件名
- 文件读写错误

单个文件的错误不会中断整个处理流程。

## 程序化调用

可以在 Node.js 脚本中直接使用（TypeScript 自带完整类型声明）：

```javascript
const { classifyIpaFiles, parseFile, parseFilename, setLogLevel } = require('@ipa/cli');

// 开启详细日志（可选）
setLogLevel('verbose');

// 分类整理文件
await classifyIpaFiles({
  directory: '/path/to/ipa/files',
  dryRun: false
});

// 解析单个文件路径（相对/绝对/~/开头均可）为关联信息 JSON
const info = parseFile('~/path/to/some/dir/微信 8.0.33.ipa');
console.log(info.absolutePath); // "/Users/xxx/path/to/some/dir/微信 8.0.33.ipa"
console.log(info.relativeDir);  // "path/to/some/dir"
console.log(info.appName);      // "微信"
console.log(info.version);      // "8.0.33"
console.log(info.targetFilename); // "微信 8.0.33.ipa"

// 解析单个文件名
const parsed = parseFilename('微信 8.0.33.ipa');
console.log(parsed.appName);  // "微信"
console.log(parsed.version);  // "8.0.33"
```

## 开发指南

### 构建与类型检查

```bash
npm run build       # tsc 编译 src → dist
npm run typecheck   # 仅类型检查，不输出
```

### 新增命令

1. 在 `src/commands/` 创建新命令文件，实现 `registerCommand(program)`
2. 在 `src/commands/index.ts` 中导出命令对象与 `registerCommand`
3. 在 `src/bin/cli.ts` 中调用 `<command>.registerCommand(program)` 注册

## 目录结构

```
├── src/                    # TypeScript 源码
│   ├── bin/
│   │   └── cli.ts          # CLI 入口（编译为 dist/bin/cli.js）
│   ├── commands/
│   │   ├── classify.ts     # classify 命令 CLI 接线（注册/校验/耗时）
│   │   ├── bundle.ts       # bundle 命令 CLI 接线（-d/-f 二选一、校验/耗时）
│   │   └── index.ts        # 命令统一导出
│   ├── core/
│   │   ├── classifier.ts   # 分类整理核心业务（与 CLI 解耦）
│   │   └── bundler.ts      # Bundle 重命名核心业务（与 CLI 解耦）
│   ├── utils/
│   │   ├── filename.ts     # 文件名解析（parseFilename / buildTargetFilename / getExtension）
│   │   ├── file.ts         # 异步文件系统操作（扫描/复制/移动/清理）
│   │   ├── bundle.ts       # Bundle ID 提取（getBundleId，adm-zip + plist）
│   │   ├── path.ts         # 路径解析（~/展开、绝对/相对路径）
│   │   ├── parse.ts        # 文件信息解析（parseFile，路径 + 文件名信息 JSON）
│   │   ├── logger.ts       # 分级日志（silent/error/warn/info/verbose）
│   │   ├── errors.ts       # 错误处理工具
│   │   └── index.ts        # 工具统一导出与终端图标
│   └── index.ts            # 程序化 API
├── dist/                   # 构建产物（tsc 输出，含 .d.ts 类型声明）
├── docs/
│   ├── REQUIREMENTS.md     # 详细需求文档
│   └── skills/project-overview/  # 项目实现总览 skill
├── tests/                  # 测试用例
│   ├── modules/            # 模块测试（node:test，与 src 模块一一对应）
│   ├── cli/                # CLI 测试（运行构建产物 dist/bin/cli.js）
│   └── prepare.sh          # 示例 IPA 文件名生成脚本
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目配置
```

## 常见问题

### Q: 文件会被删除吗？

A: 不会。文件只会被移动到对应的应用文件夹中，不会被删除。

### Q: 如果文件名无法识别怎么办？

A: 工具会跳过该文件并在最后显示跳过的文件列表。

### Q: 为什么要构建后才能运行？

A: 项目使用 TypeScript 编写，需要先执行 `npm run build`（或 `npm install` 时通过 `prepare` 自动构建）生成 `dist/` 产物。

### Q: `-v, --verbose` 有什么用？

A: 开启详细日志级别：除常规输出外，会显示每个文件的解析详情（应用名/版本/时间戳等）以及错误堆栈。

## 许可证

MIT
