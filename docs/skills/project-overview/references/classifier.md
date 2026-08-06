# Module: src/core/classifier.ts — 分类整理核心业务

## 职责

与 CLI 解耦的纯业务层：扫描 → 解析（`parseFile`）→ 规划操作 → （dry-run 预览 / 实际执行）→ 清理空目录 → 统计。所有输出经由 `logger`，受日志级别控制。

## 导出

- `classifyIpaFiles(options)` → Promise\<ClassifyStats\>
- 类型：`ClassifyOptions`、`ClassifyStats`

## 类型

```typescript
interface ClassifyOptions {
  directory: string;   // 待处理目录（绝对路径）
  output?: string;     // 输出目录，默认 'Versions'
  copy?: boolean;      // 复制而非移动
  dryRun?: boolean;    // 模拟运行
}

interface ClassifyStats {
  scanned: number;             // 扫描到的 IPA 文件总数
  processed: number;           // 成功处理数
  failed: number;              // IO 失败数
  skipped: number;             // 解析失败跳过数
  foldersCreated: number;      // 唯一应用名文件夹数
  filesOverwritten: number;    // 覆盖数
  filesRenamed: number;        // 移除时间戳数
  emptyDirectoriesRemoved?: number;  // 清理的空目录数（移动模式执行后）
}
```

## classifyIpaFiles 流程

### 1. 参数与提示

- `dryRun = Boolean(options.dryRun)`；dry-run 打印黄色 `Dry-run mode`，copy 打印 `Copy mode`。
- `await findIpaFiles(directory)`（异步并行递归扫描），0 个文件时直接返回空统计。

### 2. 构建操作计划

对每个文件调用 `parseFile(file.path)`：

- `parseFile(file.path)` 返回 `null`（文件名不符合 IPA 格式）→ 加入 `failedParsing`，`stats.skipped++`。
- 成功 → 计算 `targetPath = path.join(output, appName, targetFilename)`，`willOverwrite = fs.existsSync(targetPath)`，`hasTimestamp = timestamp !== null`。
- verbose 级别下逐文件输出解析详情。
- `appFolders` Set 统计唯一应用名；`filesRenamed`/`filesOverwritten` 同步累计。

### 3. dry-run vs 执行

- **dry-run**：打印 `Operations to be performed:`，逐条输出 `→ sourceName → relativePath`，带 `(renamed)`/`(overwrite)` 标签。
- **执行模式**：顺序 `await moveFile`/`copyFile`（避免并发 IO 竞争），成功 `logger.success`，失败 `logger.error` 并计数。
- 展示路径基于 `process.cwd()` 相对化，`relativeOutput` 在循环外预先计算一次（避免重复 `path.relative`）。

### 4. 清理与统计

- 仅当 `!dryRun && !copy && processed > 0` 时 `await removeEmptyDirs(directory)`。
- 解析失败文件列出前 10 个；`printSummary` 输出与 dry-run 一致的统计行。
- 返回可序列化的 `ClassifyStats`（无 Set 等非 JSON 结构）。

## 注意点

- 本模块不依赖 Commander；可被 CLI（`commands/classify.ts`）与程序化 API（`src/index.ts`）复用。
- `fs.existsSync` 仅用于计划阶段的覆盖检测；实际 IO 全部为异步。
