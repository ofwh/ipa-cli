# Module: src/utils/path.ts — 路径解析

## 职责

路径的标准化处理：`~` 展开、绝对/相对路径解析、目录与文件的拆分、相对路径计算。纯函数模块，基于 Node.js 内置 `path` 与 `os`。

## 导出

- `expandHome(filePath)` → string
- `resolvePath(input, baseDir?)` → string
- `parsePath(input, baseDir?)` → PathInfo
- 类型：`PathInfo`

## PathInfo 字段

```typescript
interface PathInfo {
  input: string;        // 原始输入路径（未经展开）
  absolutePath: string; // 绝对路径（含文件名）
  absoluteDir: string;  // 绝对目录（不含文件名）
  relativePath: string; // 相对路径（相对 baseDir，含文件名）
  relativeDir: string;  // 相对目录（相对 baseDir，不含文件名）
}
```

## 各函数行为

### expandHome(filePath)

- `filePath === '~'` → `os.homedir()`。
- 以 `~/` 或 `~\` 开头 → `path.join(os.homedir(), 剩余部分)`。
- 其他输入原样返回（如 `~otheruser` 不展开）。

### resolvePath(input, baseDir = process.cwd())

- 先 `expandHome(input)`，再 `path.resolve(baseDir, 展开后的路径)`。
- 相对路径基于 baseDir（默认当前工作目录）解析；绝对路径直接使用。

### parsePath(input, baseDir = process.cwd())

- `absolutePath = resolvePath(input, baseDir)`
- `absoluteDir = path.dirname(absolutePath)`
- `relativePath = path.relative(baseDir, absolutePath)`
- `relativeDir = path.dirname(relativePath)`（文件在 baseDir 根下时为 `.`）

## 注意点

- `relativePath`/`relativeDir` 使用系统原生分隔符（macOS/Linux 为 `/`，Windows 为 `\`）。
- 输入文件路径中可包含空格（如 `~/path/to/some/dir/微信 8.0.33.ipa`），按字符串处理即可。
- 本模块不校验路径是否存在；存在性校验在 `file.ts` 的 `assertDirectory`。
- CLI 层用 `resolvePath` 解析 `-d`/`-o` 参数，因此命令行支持 `~` 开头路径。
