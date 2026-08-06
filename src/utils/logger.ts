/**
 * 日志输出模块
 *
 * 提供分级（silent/error/warn/info/verbose）的统一日志接口，
 * 替代散落在各模块中的 console.log / console.error 调用。
 */

import chalk from 'chalk';

/** 日志级别 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'verbose';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
};

let currentLevel: LogLevel = 'info';

/**
 * 设置全局日志级别
 * @param level 日志级别
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * 获取当前日志级别
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

function isEnabled(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[currentLevel];
}

/** 分级日志接口 */
export interface Logger {
  /** 错误（红色，输出到 stderr） */
  error(message: string): void;
  /** 警告（黄色，输出到 stderr） */
  warn(message: string): void;
  /** 常规信息 */
  info(message: string): void;
  /** 成功（绿色） */
  success(message: string): void;
  /** 详细调试（灰色，仅 verbose 级别可见） */
  verbose(message: string): void;
}

/** 全局日志实例 */
export const logger: Logger = {
  error(message) {
    if (isEnabled('error')) {
      console.error(chalk.red(message));
    }
  },
  warn(message) {
    if (isEnabled('warn')) {
      console.warn(chalk.yellow(message));
    }
  },
  info(message) {
    if (isEnabled('info')) {
      console.log(message);
    }
  },
  success(message) {
    if (isEnabled('info')) {
      console.log(chalk.green(message));
    }
  },
  verbose(message) {
    if (isEnabled('verbose')) {
      console.log(chalk.gray(message));
    }
  },
};
