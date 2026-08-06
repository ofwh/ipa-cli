'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  findIpaFiles,
  copyFile,
  moveFile,
  ensureDir,
  assertDirectory,
  assertFile,
  removeEmptyDirs,
} = require('../../dist/utils/file.js');

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipa-file-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('findIpaFiles 递归扫描、大小写不敏感、排除非 ipa', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'sub/deep'), { recursive: true });
  fs.writeFileSync(path.join(root, '微信 8.0.33.ipa'), '');
  fs.writeFileSync(path.join(root, 'QQ 8.9.88.IPA'), '');
  fs.writeFileSync(path.join(root, 'sub/京东 11.2.8 168328.ipa'), '');
  fs.writeFileSync(path.join(root, 'sub/deep/115 30.0.0.ipa'), '');
  fs.writeFileSync(path.join(root, 'notes.txt'), '');
  fs.writeFileSync(path.join(root, 'badname.ipa'), '');

  const files = await findIpaFiles(root);
  const names = files.map((f) => f.name).sort();
  assert.deepEqual(names, ['115 30.0.0.ipa', 'QQ 8.9.88.IPA', '京东 11.2.8 168328.ipa', '微信 8.0.33.ipa', 'badname.ipa'].sort());
  for (const file of files) {
    assert.ok(path.isAbsolute(file.path), 'path 应为绝对路径');
  }
});

test('findIpaFiles 根目录不存在时抛出', async () => {
  await assert.rejects(() => findIpaFiles('/nonexistent/path/xyz'), /Cannot read directory/);
});

test('copyFile 创建嵌套目标目录并复制', async (t) => {
  const root = makeTempDir(t);
  const source = path.join(root, '微信 8.0.33.ipa');
  fs.writeFileSync(source, 'data');
  const target = path.join(root, 'out/微信/微信 8.0.33.ipa');
  await copyFile(source, target);
  assert.equal(fs.readFileSync(target, 'utf8'), 'data');
});

test('copyFile dryRun 不执行 IO', async (t) => {
  const root = makeTempDir(t);
  const source = path.join(root, 'a.ipa');
  fs.writeFileSync(source, 'x');
  const target = path.join(root, 'out/a.ipa');
  await copyFile(source, target, { dryRun: true });
  assert.equal(fs.existsSync(target), false);
});

test('moveFile 移动文件且 dryRun 不执行', async (t) => {
  const root = makeTempDir(t);
  const source = path.join(root, '京东 11.2.8 168328.ipa');
  fs.writeFileSync(source, 'data');
  const target = path.join(root, '京东/京东 11.2.8 168328.ipa');

  await moveFile(source, target, { dryRun: true });
  assert.equal(fs.existsSync(source), true);
  assert.equal(fs.existsSync(target), false);

  await moveFile(source, target);
  assert.equal(fs.existsSync(source), false);
  assert.equal(fs.readFileSync(target, 'utf8'), 'data');
});

test('ensureDir 递归创建目录', async (t) => {
  const root = makeTempDir(t);
  const filePath = path.join(root, 'a/b/c/file.ipa');
  await ensureDir(filePath);
  assert.equal(fs.existsSync(path.join(root, 'a/b/c')), true);
});

test('assertDirectory 校验目录', async (t) => {
  const root = makeTempDir(t);
  await assertDirectory(root);
  const file = path.join(root, 'f.ipa');
  fs.writeFileSync(file, '');
  await assert.rejects(() => assertDirectory(file), /Not a valid directory/);
  await assert.rejects(() => assertDirectory(path.join(root, 'missing')), /Directory does not exist/);
});

test('assertFile 校验文件', async (t) => {
  const root = makeTempDir(t);
  const file = path.join(root, 'f.ipa');
  fs.writeFileSync(file, 'data');
  await assertFile(file);
  await assert.rejects(() => assertFile(root), /Not a valid file/);
  await assert.rejects(() => assertFile(path.join(root, 'missing.ipa')), /File does not exist/);
});

test('removeEmptyDirs 清理空目录且保留根目录与非空目录', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'a/b/c'), { recursive: true });
  fs.mkdirSync(path.join(root, 'keep/nested'), { recursive: true });
  fs.writeFileSync(path.join(root, 'keep/nested/file.ipa'), '');

  const removed = await removeEmptyDirs(root);
  assert.equal(removed, 3); // c, b, a
  assert.equal(fs.existsSync(path.join(root, 'a')), false);
  assert.equal(fs.existsSync(root), true);
  assert.equal(fs.existsSync(path.join(root, 'keep/nested/file.ipa')), true);
});
