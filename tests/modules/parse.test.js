'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

const { parseFile } = require('../../dist/utils/parse.js');

test('parseFile 解析 ~ 开头路径为完整关联信息', () => {
  const info = parseFile('~/path/to/some/dir/微信 8.0.33.ipa');
  assert.ok(info);
  assert.equal(info.absolutePath, path.join(os.homedir(), 'path/to/some/dir/微信 8.0.33.ipa'));
  assert.equal(info.absoluteDir, path.join(os.homedir(), 'path/to/some/dir'));
  assert.equal(info.relativePath, path.relative(process.cwd(), info.absolutePath));
  assert.equal(info.filename, '微信 8.0.33.ipa');
  assert.equal(info.name, '微信 8.0.33');
  assert.equal(info.suffix, '.ipa');
  assert.equal(info.appName, '微信');
  assert.equal(info.version, '8.0.33');
  assert.equal(info.targetFilename, '微信 8.0.33.ipa');
  assert.equal('isIPA' in info, false, '不应包含 isIPA 字段');
  assert.equal('input' in info, false, '不应包含 input 字段');
});

test('parseFile 解析系列版本：series 独立、target 重新并入', () => {
  const info = parseFile('1Password 7 7.10.2.ipa');
  assert.ok(info);
  assert.equal(info.series, '7');
  assert.equal(info.version, '7.10.2');
  assert.equal(info.targetFilename, '1Password 7 7.10.2.ipa');
});

test('parseFile baseDir 影响相对路径', () => {
  const base = '/data/ipa';
  const info = parseFile('sub/QQ 8.9.88@com.tencent.qq.ipa', { baseDir: base });
  assert.ok(info);
  assert.equal(info.relativePath, path.join('sub', 'QQ 8.9.88@com.tencent.qq.ipa'));
  assert.equal(info.relativeDir, 'sub');
  assert.equal(info.bundleId, 'com.tencent.qq');
});

test('parseFile 多层嵌套相对路径解析', () => {
  const base = '/data/ipa';
  const info = parseFile(path.join('a', 'b', 'c', '微信 8.0.33.ipa'), { baseDir: base });
  assert.ok(info);
  assert.equal(info.relativeDir, path.join('a', 'b', 'c'));
  assert.equal(info.relativePath, path.join('a', 'b', 'c', '微信 8.0.33.ipa'));
  assert.equal(info.absoluteDir, path.join(base, 'a', 'b', 'c'));
  assert.equal(info.absolutePath, path.join(base, 'a', 'b', 'c', '微信 8.0.33.ipa'));
  assert.equal(info.appName, '微信');
});

test('parseFile 非 IPA / 无法解析返回 null', () => {
  assert.equal(parseFile('some/dir/foo.txt'), null);
  assert.equal(parseFile('badname.ipa'), null);
});

test('parseFile 时间戳信息保留且目标文件名去除', () => {
  const info = parseFile('企业微信 5.0.0(20200101000000).ipa');
  assert.ok(info);
  assert.equal(info.timestamp, '20200101000000');
  assert.equal(info.targetFilename, '企业微信 5.0.0.ipa');
});
