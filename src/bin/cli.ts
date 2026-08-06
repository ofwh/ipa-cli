#!/usr/bin/env node

/**
 * IPA Classifier - 命令行入口
 *
 * 模块化 CLI 工具（Commander.js）：
 * 所有命令作为子命令注册，便于扩展与维护。
 */

import { createRequire } from 'module';
import { program } from 'commander';
import { classifyCommand, bundleCommand } from '../commands';

// 版本号单一来源：从 package.json 读取（避免硬编码漂移）
const nodeRequire = createRequire(__filename);
const pkg = nodeRequire('../../package.json') as { version: string };

// 配置主程序
program
  .name('ipa')
  .description('IPA file classifier - Intelligently parse and classify iOS app packages by name')
  .version(pkg.version, '-V, --version', 'Display version number');

// 注册 classify 命令
classifyCommand.registerCommand(program);

// 注册 bundle 命令
bundleCommand.registerCommand(program);

// 无参数时默认展示帮助
if (process.argv.length === 2) {
  program.help();
}

// 解析命令行参数
program.parse(process.argv);
