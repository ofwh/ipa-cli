'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const commands = require('../../dist/commands/index.js');

test('commands 统一导出完整', () => {
  assert.equal(typeof commands.registerCommand, 'function');
  assert.equal(typeof commands.classifyIpaFiles, 'function');
  assert.equal(typeof commands.classifyCommand, 'object');
  assert.equal(typeof commands.classifyCommand.registerCommand, 'function');
  assert.equal(typeof commands.classifyCommand.classifyIpaFiles, 'function');
  assert.equal(commands.classifyCommand.classifyIpaFiles, commands.classifyIpaFiles);

  assert.equal(typeof commands.registerBundleCommand, 'function');
  assert.equal(typeof commands.bundleIpaFiles, 'function');
  assert.equal(typeof commands.bundleCommand, 'object');
  assert.equal(typeof commands.bundleCommand.registerCommand, 'function');
  assert.equal(typeof commands.bundleCommand.bundleIpaFiles, 'function');
  assert.equal(commands.bundleCommand.bundleIpaFiles, commands.bundleIpaFiles);
});
