'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const plist = require('plist');

const { bundleIpaFiles } = require('../../dist/core/bundler.js');
const { setLogLevel } = require('../../dist/utils/logger.js');

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipa-bundler-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** 生成带 Info.plist 的假 IPA（ZIP 容器） */
function makeIpa(filePath, bundleId, appName = 'WeChat') {
  const zip = new AdmZip();
  zip.addFile(`Payload/${appName}.app/Info.plist`, plist.build({ CFBundleIdentifier: bundleId }));
  zip.writeZip(filePath);
}

test('bundleIpaFiles 目录模式：递归重命名并返回统计', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in/sub'), { recursive: true });
  const wechat = path.join(root, 'in/微信 8.0.33.ipa');
  const qq = path.join(root, 'in/sub/QQ 8.9.88.ipa');
  makeIpa(wechat, 'com.tencent.xin');
  makeIpa(qq, 'com.tencent.qq');

  const stats = await bundleIpaFiles({ directory: path.join(root, 'in') });

  assert.deepEqual(stats, { scanned: 2, renamed: 2, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(wechat), false, '源文件应被重命名');
  assert.equal(fs.existsSync(path.join(root, 'in/微信 8.0.33@com.tencent.xin.ipa')), true);
  assert.equal(fs.existsSync(qq), false);
  assert.equal(fs.existsSync(path.join(root, 'in/sub/QQ 8.9.88@com.tencent.qq.ipa')), true);
});

test('bundleIpaFiles 文件模式：只处理单个文件', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  const ipa = path.join(root, '京东 11.2.8 168328.ipa');
  makeIpa(ipa, 'com.jd');

  const stats = await bundleIpaFiles({ file: ipa });

  assert.deepEqual(stats, { scanned: 1, renamed: 1, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(ipa), false);
  assert.equal(fs.existsSync(path.join(root, '京东 11.2.8 168328@com.jd.ipa')), true);
});

test('bundleIpaFiles dry-run：不执行重命名', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  const ipa = path.join(root, '微信 8.0.33.ipa');
  makeIpa(ipa, 'com.tencent.xin');

  const stats = await bundleIpaFiles({ file: ipa, dryRun: true });

  assert.deepEqual(stats, { scanned: 1, renamed: 0, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(ipa), true);
  assert.equal(fs.existsSync(path.join(root, '微信 8.0.33@com.tencent.xin.ipa')), false);
});

test('bundleIpaFiles 已带 Bundle 命名的文件跳过', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  const ipa = path.join(root, 'QQ 8.9.88@com.tencent.qq.ipa');
  makeIpa(ipa, 'com.tencent.qq');

  const stats = await bundleIpaFiles({ file: ipa });

  assert.deepEqual(stats, { scanned: 1, renamed: 0, skipped: 1, failed: 0 });
  assert.equal(fs.existsSync(ipa), true, '文件名已包含 Bundle ID，不应重命名');
});

test('bundleIpaFiles 未找到 Bundle ID 的文件跳过', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  const ipa = path.join(root, 'badname.ipa');
  fs.writeFileSync(ipa, 'not a zip archive');

  const stats = await bundleIpaFiles({ file: ipa });

  assert.deepEqual(stats, { scanned: 1, renamed: 0, skipped: 1, failed: 0 });
  assert.equal(fs.existsSync(ipa), true, '无 Bundle ID 的文件应保留');
});

test('bundleIpaFiles 目录下无 ipa 文件时返回空统计', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in'));
  fs.writeFileSync(path.join(root, 'in/notes.txt'), 'not an ipa');

  const stats = await bundleIpaFiles({ directory: path.join(root, 'in') });

  assert.deepEqual(stats, { scanned: 0, renamed: 0, skipped: 0, failed: 0 });
});

test('bundleIpaFiles 大写 .IPA 扩展名：保留原始扩展名重命名', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  const ipa = path.join(root, 'Test 1.0.0.IPA');
  makeIpa(ipa, 'com.test');

  const stats = await bundleIpaFiles({ file: ipa });

  assert.deepEqual(stats, { scanned: 1, renamed: 1, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(ipa), false);
  assert.equal(fs.existsSync(path.join(root, 'Test 1.0.0@com.test.IPA')), true);
});

test('bundleIpaFiles -o 输出模式：平铺输出到目标目录', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in/sub'), { recursive: true });
  const wechat = path.join(root, 'in/微信 8.0.33.ipa');
  const qq = path.join(root, 'in/sub/QQ 8.9.88.ipa');
  makeIpa(wechat, 'com.tencent.xin');
  makeIpa(qq, 'com.tencent.qq');

  const stats = await bundleIpaFiles({
    directory: path.join(root, 'in'),
    output: path.join(root, 'out'),
  });

  assert.deepEqual(stats, { scanned: 2, renamed: 2, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(path.join(root, 'out/微信 8.0.33@com.tencent.xin.ipa')), true, '平铺输出');
  assert.equal(fs.existsSync(path.join(root, 'out/QQ 8.9.88@com.tencent.qq.ipa')), true, '子目录文件也应平铺输出');
  assert.equal(fs.existsSync(wechat), false, '源文件应被移动');
  assert.equal(fs.existsSync(qq), false);
});

test('bundleIpaFiles -o + keepDir：保留输入目录下的次级目录结构', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in/dir2/dir3'), { recursive: true });
  const wechat = path.join(root, 'in/微信 8.0.33.ipa');
  const qq = path.join(root, 'in/dir2/dir3/QQ 8.9.88.ipa');
  makeIpa(wechat, 'com.tencent.xin');
  makeIpa(qq, 'com.tencent.qq');

  const stats = await bundleIpaFiles({
    directory: path.join(root, 'in'),
    output: path.join(root, 'out'),
    keepDir: true,
  });

  assert.deepEqual(stats, { scanned: 2, renamed: 2, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(path.join(root, 'out/微信 8.0.33@com.tencent.xin.ipa')), true, '输入根目录文件输出到输出根');
  assert.equal(fs.existsSync(path.join(root, 'out/dir2/dir3/QQ 8.9.88@com.tencent.qq.ipa')), true, '保留 dir2/dir3 次级目录结构');
  assert.equal(fs.existsSync(qq), false);
});

test('bundleIpaFiles -o 文件模式：输出到目标目录', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  const ipa = path.join(root, '京东 11.2.8 168328.ipa');
  makeIpa(ipa, 'com.jd');

  const stats = await bundleIpaFiles({ file: ipa, output: path.join(root, 'out') });

  assert.deepEqual(stats, { scanned: 1, renamed: 1, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(path.join(root, 'out/京东 11.2.8 168328@com.jd.ipa')), true);
  assert.equal(fs.existsSync(ipa), false);
});

test('bundleIpaFiles -o 已带 Bundle 命名的文件：移动到输出目录且不重复添加', async (t) => {
  setLogLevel('silent');
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in'));
  const ipa = path.join(root, 'in/QQ 8.9.88@com.tencent.qq.ipa');
  makeIpa(ipa, 'com.tencent.qq');

  const stats = await bundleIpaFiles({ file: ipa, output: path.join(root, 'out') });

  assert.deepEqual(stats, { scanned: 1, renamed: 1, skipped: 0, failed: 0 });
  assert.equal(fs.existsSync(path.join(root, 'out/QQ 8.9.88@com.tencent.qq.ipa')), true, '应移动到输出目录');
  assert.equal(fs.existsSync(ipa), false);
});
