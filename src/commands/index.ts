/**
 * 命令模块统一导出
 */

import { registerCommand as registerClassifyCommand } from './classify';
import { classifyIpaFiles } from '../core/classifier';
import { registerCommand as registerBundleCommand } from './bundle';
import { bundleIpaFiles } from '../core/bundler';

export const classifyCommand = {
  registerCommand: registerClassifyCommand,
  classifyIpaFiles,
};

export const bundleCommand = {
  registerCommand: registerBundleCommand,
  bundleIpaFiles,
};

export { registerCommand } from './classify';
export { classifyIpaFiles } from '../core/classifier';
export type { ClassifyOptions, ClassifyStats } from '../core/classifier';
export { registerCommand as registerBundleCommand } from './bundle';
export { bundleIpaFiles } from '../core/bundler';
export type { BundleOptions, BundleStats } from '../core/bundler';
