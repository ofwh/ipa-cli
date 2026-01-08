使用 TypeScript 构建 CLI 工具是一个非常棒的选择，它能提供强大的类型检查和更好的开发体验。要打造一个高质量、规范化且易于维护的 CLI 工具，需要遵循一系列现代化的“最佳实践”。

以下是基于 2024/2025 年前端/Node.js 生态的完整指南，涵盖技术选型、开发规范、构建流程和发布策略。

---

### 1. 核心技术栈选型 (The Stack)

不要重复造轮子。使用社区公认的高质量库可以极大提升开发效率和用户体验。

| 功能             | 推荐库                                  | 理由                                                                       |
| ---------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| **命令行框架**   | **Commander.js** 或 **CAC**             | Commander 是行业标准，生态最全；CAC 更轻量，适合简单工具。                 |
| **交互式询问**   | **Inquirer** (v8) 或 **@clack/prompts** | Inquirer v9+ 为纯 ESM，CommonJS 项目请使用 v8；@clack/prompts 界面更现代。 |
| **颜色/样式**    | **Chalk** (v4) 或 **Picocolors**        | Chalk v5 是纯 ESM，如果你的项目不是纯 ESM，建议用 v4 或 Picocolors。       |
| **Loading 动画** | **Ora**                                 | 优雅的终端 Spinner 动画。                                                  |
| **构建工具**     | **tsup**                                | **强烈推荐**。基于 esbuild，零配置构建 TS，速度极快，自动处理 `.d.ts`。    |
| **包管理器**     | **pnpm**                                | 速度快，节省磁盘空间，对依赖提升处理更严格。                               |

---

### 2. 项目初始化与目录结构

一个清晰的结构是规范化的第一步。

**推荐目录结构：**

```text
my-cli/
├── bin/             # 编译后的可执行文件入口（由构建工具生成或手动指定）
├── src/
│   ├── commands/    # 具体的命令逻辑 (例如 init.ts, build.ts)
│   ├── utils/       # 工具函数
│   ├── templates/   # 如果是脚手架，这里放模板文件
│   └── index.ts     # 入口文件，负责初始化 CLI
├── dist/            # 构建产物
├── tests/           # 测试文件
├── package.json
├── tsconfig.json
├── tsup.config.ts   # 构建配置
└── .eslintrc.js     # 代码规范配置

```

**初始化命令：**

```bash
mkdir my-cli && cd my-cli
pnpm init
pnpm add -D typescript tsup @types/node eslint prettier
pnpm add commander chalk@4 ora@5 inquirer@8

```

---

### 3. 代码开发规范与自动化 (Quality Assurance)

这是你提到的“规范”核心部分。我们需要通过工具强制执行规范，而不是靠文档。

#### A. Linting & Formatting (ESLint + Prettier)

统一代码风格，避免低级错误。

1. **安装：** 使用 `eslint-config-prettier` 解决冲突。
2. **配置 (.prettierrc):**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80
}
```

#### B. Git 提交规范 (Husky + Commitlint)

强制 Git 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范（如 `feat: add new command`, `fix: handle error`）。

1. **安装 Husky & Commitlint:**

```bash
pnpm add -D husky lint-staged @commitlint/{cli,config-conventional}

```

2. **启用 Hooks:**

```bash
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'

```

3. **Lint Staged:** 在 commit 前只检查暂存区的文件，确保提交的代码是干净的。

---

### 4. TypeScript 与构建配置

#### tsconfig.json 最佳实践

```json
{
  "compilerOptions": {
    "target": "ES2020", // Node 14+ 支持大部分 ES2020 特性
    "module": "commonjs", // 或者 "ESNext" 取决于你的发布策略
    "moduleResolution": "node",
    "strict": true, // 开启严格模式
    "resolveJsonModule": true, // 允许导入 JSON 模块
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

#### tsup 构建配置 (tsup.config.ts)

为什么用 `tsup`？因为它能将你的 TS 代码及其依赖打包成一个或几个文件，极大**加快 CLI 启动速度**（减少 Node.js 读取大量小文件的 I/O 开销）。

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // 同时输出 CommonJS 和 ESM
  dts: true, // 生成类型定义
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true, // 压缩代码，减小体积
})
```

---

### 5. CLI 开发核心细节

#### Shebang 与 Bin 配置

要让系统知道这是一个 Node.js 可执行文件，必须在入口文件顶部添加 Shebang，并在 `package.json` 中声明。

**src/index.ts:**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { version } from '../package.json'

const program = new Command()

program.name('my-cli').version(version).description('A fantastic CLI tool')

// 注册命令
program.parse(process.argv)
```

**package.json:**

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "bin": {
    "my-cli": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "start": "node dist/index.js",
    "lint": "eslint src"
  }
}
```

#### 本地调试

不要每次都发布到 npm 调试。

1. 运行 `pnpm run build`。
2. 在项目根目录运行 `npm link`。
3. 现在你可以在终端任何地方使用 `my-cli` 命令了。

---

### 6. 发布流程 (Publishing)

不要手动修改版本号。使用自动化工具来管理版本和 Changelog。

#### 推荐工具：Changesets

相比 Semantic Release，[Changesets](https://github.com/changesets/changesets) 更加灵活，特别适合 monorepo 或需要手动控制发布节奏的场景。

1. **初始化:** `npx changeset init`
2. **开发流:**

- 当你开发完一个特性，运行 `npx changeset`，它会引导你写一段变更说明。
- 这会生成一个 markdown 文件。提交它。

3. **发布流 (CI/CD):**

- 当合并到主分支时，Changesets 会自动消耗 markdown 文件，更新 `package.json` 版本号，并生成 `CHANGELOG.md`。
- 最后执行 `pnpm publish`。

#### GitHub Actions 配置示例

创建一个 `.github/workflows/release.yml`：

```yaml
name: Release
on:
  push:
    branches:
      - main
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

### 总结：最佳实践清单

1. **架构:** 使用 `Commander` 做路由，`tsup` 做打包。
2. **规范:** `ESLint` + `Prettier` + `Husky` + `Commitlint` 组成防线。
3. **调试:** 使用 `npm link` 进行本地全局模拟。
4. **体验:** 注意启动速度（打包依赖），提供清晰的帮助信息 (`--help`)。
5. **发布:** 使用 `Changesets` 自动化版本管理和 Changelog 生成。

**下一步：**
您是否希望我为您生成一个包含上述所有配置（ESLint, Prettier, tsup, Husky）的 **`package.json`** 和 **项目初始化脚本**，让您可以直接复制粘贴开始开发？
