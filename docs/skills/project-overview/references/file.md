# Module: src/utils/file.ts — 文件系统操作

## 职责

封装全部文件系统能力：递归扫描 IPA 文件、确保目标目录存在、复制/移动文件（含跨文件系统回退）、目录有效性校验、递归清理空目录。全部使用异步 API（`fs/promises`）。

## 导出

- `findIpaFiles(directory)` → Promise\<FileEntry[]\>
- `ensureDir(filePath)` → Promise\<void\>
- `copyFile(source, target, options?)` → Promise\<void\>
- `moveFile(source, target, options?)` → Promise\<void\>
- `assertDirectory(directory)` → Promise\<void\>（无效时抛错）
- `removeEmptyDirs(directory)` → Promise\<number\>
- 类型：`FileEntry`（`{ path, name }`）、`FileOperationOptions`（`{ dryRun? }`）

## 各函数行为

### findIpaFiles(directory)

- 递归遍历目录（`fsp.readdir(dir, { withFileTypes: true })`），**子目录并行扫描**（`Promise.all`），适配大量文件/深层目录。
- 收集文件名以 `.ipa` 结尾（`toLowerCase()` 比较，大小写不敏感）的文件。
- 无法读取的子目录通过 `logger.warn` 记录后跳过；根目录读取失败时抛出 `Cannot read directory: ...`。
- 使用 `Dirent` 判断类型：符号链接既不是 `isFile()` 也不是 `isDirectory()`，因此符号链接目录不会被递归进入。

### ensureDir(filePath)

- `fsp.mkdir(path.dirname(filePath), { recursive: true })`，目录已存在时不会抛错（无需 existsSync 预检）。

### copyFile(source, target, options = {})

- `options.dryRun` 为 true 时直接返回，不执行 IO。
- 先 `ensureDir`，再 `fsp.copyFile`。
- 失败时抛出 `Failed to copy file: ...`。

### moveFile(source, target, options = {})

- `options.dryRun` 为 true 时直接返回。
- 先 `ensureDir`。
- 优先 `fsp.rename`；若错误码为 `EXDEV`（跨文件系统），回退为 `fsp.copyFile` + `fsp.unlink`（复制后删除源文件）；其他错误原样抛出。
- 失败时抛出 `Failed to move file: ...`。

### assertDirectory(directory)

- 目录不存在 → 抛 `Directory does not exist: <dir>`。
- 存在但不是目录 → 抛 `Not a valid directory: <dir>`。
- 有效时正常返回（无返回值）。

### removeEmptyDirs(directory)

- 递归后序遍历（子目录先处理，顺序遍历即可，无需并行）：先递归子目录，再检查当前目录。
- 空目录且不是根目录（`dir !== directory`）时 `fsp.rmdir` 移除，计数累加。
- 无法读取/移除的目录通过 `logger.warn` 记录后继续，不影响返回计数。
- 返回移除的目录数量。

## 注意点

- 全部使用异步 API，避免阻塞事件循环。
- 覆盖检测（`fs.existsSync`）由 `core/classifier.ts` 在计划阶段完成，本模块不处理覆盖策略。
- `hasErrorCode`/`toErrorMessage` 来自 `src/utils/errors.ts`。
