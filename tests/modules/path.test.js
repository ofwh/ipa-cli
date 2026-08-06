'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

const { expandHome, resolvePath, parsePath } = require('../../dist/utils/path.js');

test('expandHome 展开 ~ 为主目录', () => {
  assert.equal(expandHome('~'), os.homedir());
  assert.equal(expandHome('~/dir/file.ipa'), path.join(os.homedir(), 'dir/file.ipa'));
  assert.equal(expandHome('/abs/path.ipa'), '/abs/path.ipa');
  assert.equal(expandHome('~otheruser/x'), '~otheruser/x');
});

test('resolvePath 支持绝对/相对/~ 路径', () => {
  assert.equal(resolvePath('/abs/path.ipa'), '/abs/path.ipa');
  assert.equal(resolvePath('rel/file.ipa', '/base'), path.join('/base', 'rel/file.ipa'));
  assert.equal(resolvePath('~/file.ipa'), path.join(os.homedir(), 'file.ipa'));
});

test('parsePath 返回路径四要素', () => {
  const info = parsePath('some/dir/微信 8.0.33.ipa', '/base');
  assert.equal(info.input, 'some/dir/微信 8.0.33.ipa');
  assert.equal(info.absolutePath, path.join('/base', 'some/dir/微信 8.0.33.ipa'));
  assert.equal(info.absoluteDir, path.join('/base', 'some/dir'));
  assert.equal(info.relativePath, path.join('some/dir', '微信 8.0.33.ipa'));
  assert.equal(info.relativeDir, path.join('some', 'dir'));
});

test('parsePath 基准目录下的文件 relativeDir 为 .', () => {
  const info = parsePath('file.ipa', '/base');
  assert.equal(info.relativePath, 'file.ipa');
  assert.equal(info.relativeDir, '.');
});
