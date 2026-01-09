# Git Workflow & CI/CD Strategy

## 1. 概述 (Overview)

本文档描述了 `ipa-cli` 项目的 Git 分支管理策略及自动化构建发布流程（CI/CD）。采用业界最佳实践 **Changesets** 进行版本管理和 Changelog 生成，实现语义化版本控制。

## 2. 分支策略 (Branch Strategy)

| 分支名称            | 类型     | 说明                                                       | 保护规则                                       |
| :------------------ | :------- | :--------------------------------------------------------- | :--------------------------------------------- |
| **main**            | 生产分支 | 存放随时可发布的稳定代码，与 pnpm 发布的最新版本保持一致。 | 🚫 禁止直接 Push<br>✅ 仅通过 release 分支合并 |
| **release**         | 发布分支 | 用于准备发布的预演分支及正式发布流。                       | 🚫 禁止直接 Push<br>✅ 通过 PR 合并            |
| **feat/\*, fix/\*** | 开发分支 | 日常功能开发 (`feat/...`)、Bug修复 (`fix/...`)。           | 无                                             |

## 3. 工作流设计 (Workflow Design)

采用 **Changesets** 驱动的发布流，将版本管理自动化、可视化。

### 3.1 阶段一：开发与校验 (Development & CI)

**开发者操作**：

1.  开发功能或修复 Bug。
2.  运行 `pnpm changeset` 添加变更说明（交互式选择 patch/minor/major 并填写描述）。
3.  提交代码及生成的 changeset md 文件。

**CI 流水线 (Pull Request)**：

- **Trigger**: PR created targeting `release` branch.
- **Job: Check**
  - Install Dependencies (`pnpm install`).
  - Lint & Build Checks.

### 3.2 阶段二：版本提案 (Version PR)

**触发条件**：普通代码（包含 `.changeset` 文件）合并到 `release` 分支时。
**自动化行为 (Changesets Action)**：

1.  GitHub Action 识别到存在未消费的 Changeset 文件。
2.  自动生成一个名为 **"Version Packages"** 的 Pull Request。
    - 此 PR 会自动：
      - 消耗掉 changeset 文件。
      - 根据 semver 规则升级 `package.json` 版本号。
      - 更新 `CHANGELOG.md` 文件。

### 3.3 阶段三：正式发布 (Publish)

**触发条件**：维护者 **合并** 了上述的 **"Version Packages"** PR 到 `release` 分支（即版本号变更进入 `release`）。
**自动化行为**：

1.  **Publish**: 执行构建并调用 `pnpm changeset publish`。
    - 检查 `package.json` 版本是否已发布。
    - 若未发布，则发布到 NPM。
    - 推送 Git Tags (e.g., `v1.1.0`)。
2.  **Sync**: 将 `release` 分支（包含新版本号、Changelog 和 Tag）合并回 `main` 分支，保持生产分支同步。

## 4. 流程图 (Flowchart)

```mermaid
graph TD
    subgraph Development
    A[Dev: Code + Changeset] -->|Push| B(PR to release)
    end

    subgraph "CI Check"
    B -.->|Test & Lint| C{Pass?}
    end

    C -->|Yes| D[Merge to release branch]

    subgraph "Release Branch Pipeline"
    D -->|Accumulate Changesets| E[Action: Create 'Version Packages' PR]
    E -->|Maintainer Merges PR| F[Code Updated (Version & Changelog)]
    F -->|Trigger| G[Action: Build & Publish]
    G -->|Success| H[NPM Publish & Git Tags]
    end

    H -->|Sync| I[Merge Release to Main]
```

## 5. 配置要求 (Configuration)

### 5.1 NPM Scripts

`package.json` 建议包含以下脚本（Changesets 专用）：

- `changeset`: `changeset` (用于生成变更文件)
- `version-packages`: `changeset version` (用于升级版本)
- `release`: `pnpm build && changeset publish` (用于发布)

### 5.2 Packages

- `@changesets/cli`: 核心工具（已安装）。

### 5.3 环境变量与 Secrets (Secrets & Variables)

为了确保 GitHub Actions 能够正确执行发布流程，需要在 GitHub 仓库设置中配置以下密钥。

**(1) 必填 Secrets (Required Secrets)**

| 变量名称        | 必填  | 作用                                                        | 获取方式 / 示例                                                                                                                  |
| :-------------- | :---- | :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **`NPM_TOKEN`** | ✅ 是 | **NPM 发布令牌**。<br>用于赋予 CI 机器人发布 npm 包的权限。 | 1. 登录 npmjs.com<br>2. Access Tokens -> Generate New Token (Automation)<br>3. 复制 `npm_...` 开头的 Token 填入 GitHub Secrets。 |

**(2) 内置 Secrets (Built-in)**

| 变量名称           | 来源   | 作用                                                  | 权限说明                                                                          |
| :----------------- | :----- | :---------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **`GITHUB_TOKEN`** | GitHub | **仓库操作令牌**。<br>用于创建 PR、打 Tag、回写代码。 | 无需手动配置。利用 Actions 内置权限，workflow 文件中已声明 `permissions: write`。 |

**(3) 环境变量 (Env Vars)**

| 变量名称          | 描述                                                                                                                              |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_AUTH_TOKEN` | `npm/pnpm publish` 命令的标准鉴权变量。在 GitHub Workflow 中，我们将 `secrets.NPM_TOKEN` 映射为此变量，以便发布脚本拥有发包权限。 |
| `CI`              | 系统自动注入，标记 CI 环境。                                                                                                      |

## 6. 开发者规范 (Developer Guide)

- **No Changeset, No Merge**: 凡是修改了源码并希望发布的变动，必须包含 Changeset。
- **语义化**: 只有 `fix` 才选 patch，`feat` 选 minor。
- **不手动改版本**: 禁止手动修改 `package.json` 的 version 字段，一切由工具接管。
