# Module: src/utils/index.ts — 工具统一导出

## 职责

工具层聚合出口：组合 `filename.ts` / `file.ts` / `bundle.ts` / `path.ts` / `parse.ts` / `logger.ts` / `errors.ts` 的能力。

## 关键实现

- 从 `./filename` 导出 `parseFilename`、`buildTargetFilename`、`getExtension`。
- 从 `./file` 导出 `findIpaFiles`、`copyFile`、`moveFile`、`ensureDir`、`assertDirectory`、`assertFile`、`removeEmptyDirs`。
- 从 `./bundle` 导出 `getBundleId`。
- 从 `./path` 导出 `expandHome`、`resolvePath`、`parsePath`。
- 从 `./parse` 导出 `parseFile`。
- 从 `./logger` 导出 `logger`、`setLogLevel`、`getLogLevel`。
- 从 `./errors` 导出 `toErrorMessage`、`hasErrorCode`。

## 调用关系

- 被 `src/core/classifier.ts`、`src/core/bundler.ts`、`src/commands/classify.ts`、`src/commands/bundle.ts` 与 `src/index.ts`（程序化 API）消费。
- `package.json` 的 `exports['./utils']` 指向编译产物 `dist/utils/index.js`。
