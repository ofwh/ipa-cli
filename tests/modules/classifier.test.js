'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { classifyIpaFiles } = require('../../dist/core/classifier.js');
const { setLogLevel } = require('../../dist/utils/logger.js');

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipa-classifier-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const FILES = [
  '微信 8.0.33.ipa',
  '微信 8.0.32(20200102000000).ipa',
  '京东 11.2.8 168328.ipa',
  '115 30.0.0.ipa',
  'QQ 8.9.88@com.tencent.qq.ipa',
  '1Password 7 7.10.2.ipa',
  'badname.ipa',
];

function seed(root) {
  fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
  for (const name of FILES) {
    fs.writeFileSync(path.join(root, name), 'data');
  }
  fs.writeFileSync(path.join(root, 'sub/淘宝 10 10.2.3 168328(20200101000000)@com.taobao.ipa'), 'data');
  fs.writeFileSync(path.join(root, 'notes.txt'), 'not ipa');
}

test('classifyIpaFiles dry-run：统计正确且不产生 IO', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  seed(root);
  const out = path.join(root, 'out');

  const stats = await classifyIpaFiles({ directory: root, output: out, dryRun: true });
  assert.equal(stats.scanned, 8);
  assert.equal(stats.processed, 0);
  assert.equal(stats.skipped, 1);
  assert.equal(stats.foldersCreated, 6);
  assert.equal(stats.filesRenamed, 2);
  assert.equal(fs.existsSync(out), false, 'dry-run 不应创建输出目录');
  for (const name of FILES) {
    assert.equal(fs.existsSync(path.join(root, name)), true, 'dry-run 不应移动文件: ' + name);
  }
});

test('classifyIpaFiles 实际执行：移动、去时间戳、清理空目录、跳过坏文件', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  seed(root);

  const stats = await classifyIpaFiles({ directory: root, output: path.join(root, 'Versions') });
  assert.equal(stats.scanned, 8);
  assert.equal(stats.processed, 7);
  assert.equal(stats.skipped, 1);
  assert.equal(stats.filesRenamed, 2);
  assert.ok(stats.emptyDirectoriesRemoved > 0);

  // 目标文件树
  assert.equal(fs.existsSync(path.join(root, 'Versions/微信/微信 8.0.33.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'Versions/微信/微信 8.0.32.ipa')), true, '时间戳应移除');
  assert.equal(fs.existsSync(path.join(root, 'Versions/京东/京东 11.2.8 168328.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'Versions/115/115 30.0.0.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'Versions/QQ/QQ 8.9.88@com.tencent.qq.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'Versions/1Password/1Password 7 7.10.2.ipa')), true, 'series 应重新并入目标文件名');
  assert.equal(fs.existsSync(path.join(root, 'Versions/淘宝/淘宝 10 10.2.3 168328@com.taobao.ipa')), true);

  // 源目录仅剩无法解析的文件
  assert.equal(fs.existsSync(path.join(root, 'badname.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'notes.txt')), true);
  assert.equal(fs.existsSync(path.join(root, '微信 8.0.33.ipa')), false);
});

test('classifyIpaFiles 处理根目录与多层嵌套目录下的文件', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  fs.writeFileSync(path.join(root, '微信 8.0.33.ipa'), 'data');
  fs.mkdirSync(path.join(root, 'a/b/c'), { recursive: true });
  fs.writeFileSync(path.join(root, 'a/QQ 8.9.88.ipa'), 'data');
  fs.writeFileSync(path.join(root, 'a/b/京东 11.2.8 168328.ipa'), 'data');
  fs.writeFileSync(path.join(root, 'a/b/c/115 30.0.0.ipa'), 'data');

  const stats = await classifyIpaFiles({ directory: root, output: path.join(root, 'Versions') });
  assert.equal(stats.scanned, 4, '应扫描到根目录与各层嵌套目录下的文件');
  assert.equal(stats.processed, 4);
  assert.equal(stats.skipped, 0);
  assert.ok(stats.emptyDirectoriesRemoved >= 3, '移动后多层空目录应被清理');

  assert.equal(fs.existsSync(path.join(root, 'Versions/微信/微信 8.0.33.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'Versions/QQ/QQ 8.9.88.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'Versions/京东/京东 11.2.8 168328.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'Versions/115/115 30.0.0.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'a')), false, '嵌套空目录应被清理');
  assert.equal(fs.existsSync(root), true, '根目录应保留');
});

test('classifyIpaFiles copy 模式：源文件保留', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  seed(root);
  const out = path.join(root, 'copy-out');

  const stats = await classifyIpaFiles({ directory: root, output: out, copy: true });
  assert.equal(stats.processed, 7);
  assert.equal(fs.existsSync(path.join(root, '微信 8.0.33.ipa')), true, 'copy 模式应保留源文件');
  assert.equal(fs.existsSync(path.join(out, '微信/微信 8.0.33.ipa')), true);
  assert.equal(stats.emptyDirectoriesRemoved, undefined, 'copy 模式不应清理空目录');
});

test('classifyIpaFiles 无 ipa 文件时返回空统计', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  fs.writeFileSync(path.join(root, 'notes.txt'), '');
  const stats = await classifyIpaFiles({ directory: root });
  assert.deepEqual(stats, {
    scanned: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    foldersCreated: 0,
    filesOverwritten: 0,
    filesRenamed: 0,
  });
});
