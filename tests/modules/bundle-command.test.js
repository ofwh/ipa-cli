'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Command } = require('commander');

const { registerCommand } = require('../../dist/commands/bundle.js');

test('registerCommand 注册 bundle 子命令及选项', () => {
  const program = new Command();
  registerCommand(program);
  const command = program.commands.find((c) => c.name() === 'bundle');
  assert.ok(command, '应注册 bundle 命令');
  assert.equal(command.description(), 'Rename IPA files with bundle identifier');

  const optionNames = command.options.map((o) => o.name());
  for (const name of ['directory', 'file', 'output', 'keep-dir', 'dry-run', 'verbose']) {
    assert.ok(optionNames.includes(name), '缺少选项: ' + name);
  }
});
