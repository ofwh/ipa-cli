'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const plist = require('plist');

const { getBundleId } = require('../../dist/utils/bundle.js');

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipa-bundle-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** 生成带 Info.plist 的假 IPA（ZIP 容器） */
function makeIpa(filePath, bundleId, appName = 'WeChat') {
  const zip = new AdmZip();
  zip.addFile(`Payload/${appName}.app/Info.plist`, plist.build({ CFBundleIdentifier: bundleId }));
  zip.writeZip(filePath);
}

test('getBundleId 返回 Info.plist 中的 CFBundleIdentifier', (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, '微信 8.0.33.ipa');
  makeIpa(ipa, 'com.tencent.xin');
  assert.equal(getBundleId(ipa), 'com.tencent.xin');
});

test('getBundleId 忽略非 Payload/<App>.app/Info.plist 路径', (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, 'a.ipa');
  const zip = new AdmZip();
  zip.addFile('Payload/WeChat.app/Resources/Info.plist', plist.build({ CFBundleIdentifier: 'com.tencent.xin' }));
  zip.addFile('Payload/WeChat.app/embedded.mobileprovision', 'data');
  zip.writeZip(ipa);
  assert.equal(getBundleId(ipa), null);
});

test('getBundleId 非 zip 文件返回 null', (t) => {
  const root = makeTempDir(t);
  const file = path.join(root, 'plain.ipa');
  fs.writeFileSync(file, 'not a zip archive');
  assert.equal(getBundleId(file), null);
});

test('getBundleId 缺少 Info.plist 的 zip 返回 null', (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, 'a.ipa');
  const zip = new AdmZip();
  zip.addFile('Payload/WeChat.app/embedded.mobileprovision', 'data');
  zip.writeZip(ipa);
  assert.equal(getBundleId(ipa), null);
});

test('getBundleId Info.plist 缺少 CFBundleIdentifier 返回 null', (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, 'a.ipa');
  const zip = new AdmZip();
  zip.addFile('Payload/WeChat.app/Info.plist', plist.build({ CFBundleDisplayName: 'WeChat' }));
  zip.writeZip(ipa);
  assert.equal(getBundleId(ipa), null);
});
