'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseFilename,
  buildTargetFilename,
  getExtension,
} = require('../../dist/utils/filename.js');

const SCRIPT_NAMES = (() => {
  const scriptPath = path.resolve(__dirname, '../../tests/prepare.sh');
  const script = fs.readFileSync(scriptPath, 'utf8');
  return [...script.matchAll(/touch "([^"]+)"/g)].map((m) => m[1]);
})();

test('getExtension 提取扩展名（含前导点）', () => {
  assert.equal(getExtension('微信 8.0.33.ipa'), '.ipa');
  assert.equal(getExtension('QQ 8.9.88@com.tencent.qq.ipa'), '.ipa');
  assert.equal(getExtension('no-extension'), '');
  assert.equal(getExtension('.hidden'), '');
});

test('基础格式：AppName Version', () => {
  const p = parseFilename('微信 8.0.33.ipa');
  assert.ok(p);
  assert.equal(p.filename, '微信 8.0.33.ipa');
  assert.equal(p.name, '微信 8.0.33');
  assert.equal(p.suffix, '.ipa');
  assert.equal(p.appName, '微信');
  assert.equal(p.version, '8.0.33');
  assert.equal(p.series, null);
  assert.equal(p.buildNumber, null);
  assert.equal(p.timestamp, null);
  assert.equal(p.bundleId, null);
  assert.equal(buildTargetFilename(p), '微信 8.0.33.ipa');
});

test('纯数字应用名', () => {
  const p = parseFilename('115 30.0.0.ipa');
  assert.ok(p);
  assert.equal(p.appName, '115');
  assert.equal(p.version, '30.0.0');
});

test('带构建号（保留）', () => {
  const p = parseFilename('京东 11.2.8 168328.ipa');
  assert.ok(p);
  assert.equal(p.appName, '京东');
  assert.equal(p.version, '11.2.8');
  assert.equal(p.buildNumber, '168328');
  assert.equal(buildTargetFilename(p), '京东 11.2.8 168328.ipa');
});

test('带时间戳（目标文件名移除）', () => {
  const p = parseFilename('企业微信 5.0.0(20200101000000).ipa');
  assert.ok(p);
  assert.equal(p.timestamp, '20200101000000');
  assert.equal(p.buildNumber, null);
  assert.equal(buildTargetFilename(p), '企业微信 5.0.0.ipa');
});

test('带 Bundle ID（保留）', () => {
  const p = parseFilename('QQ 8.9.88@com.tencent.qq.ipa');
  assert.ok(p);
  assert.equal(p.bundleId, 'com.tencent.qq');
  assert.equal(buildTargetFilename(p), 'QQ 8.9.88@com.tencent.qq.ipa');
});

test('版本系列：series 独立、version 纯净、目标文件名重新并入', () => {
  const p = parseFilename('1Password 7 7.10.2.ipa');
  assert.ok(p);
  assert.equal(p.appName, '1Password');
  assert.equal(p.series, '7');
  assert.equal(p.version, '7.10.2');
  assert.equal(buildTargetFilename(p), '1Password 7 7.10.2.ipa');

  const s = parseFilename('Safari 15 15.0.0.ipa');
  assert.ok(s);
  assert.equal(s.series, '15');
  assert.equal(s.version, '15.0.0');
  assert.equal(buildTargetFilename(s), 'Safari 15 15.0.0.ipa');

  const b = parseFilename('Bloons TD 6 47.2.ipa');
  assert.ok(b);
  assert.equal(b.appName, 'Bloons TD');
  assert.equal(b.series, '6');
  assert.equal(b.version, '47.2');
  assert.equal(buildTargetFilename(b), 'Bloons TD 6 47.2.ipa');
});

test('纯数字版本（构建号形式）', () => {
  const p = parseFilename('京东 170045.ipa');
  assert.ok(p);
  assert.equal(p.appName, '京东');
  assert.equal(p.version, '170045');
  assert.equal(p.buildNumber, null);
  assert.equal(buildTargetFilename(p), '京东 170045.ipa');
});

test('复杂组合：系列 + 构建号 + 时间戳 + Bundle ID', () => {
  const p = parseFilename('淘宝 10 10.2.3 168328(20200101000000)@com.taobao.ipa');
  assert.ok(p);
  assert.equal(p.series, '10');
  assert.equal(p.version, '10.2.3');
  assert.equal(p.buildNumber, '168328');
  assert.equal(p.timestamp, '20200101000000');
  assert.equal(p.bundleId, 'com.taobao');
  assert.equal(buildTargetFilename(p), '淘宝 10 10.2.3 168328@com.taobao.ipa');
});

test('特殊字符与中文应用名', () => {
  for (const name of ['Camera+ 10.39.ipa', "Don't Starve 1.47.ipa", 'Bank of China 9.0.0.ipa']) {
    const p = parseFilename(name);
    assert.ok(p, '应可解析: ' + name);
    assert.ok(p.appName.length > 0);
    assert.ok(p.version.length > 0);
  }
  const k = parseFilename('Keynote 讲演 14.3.ipa');
  assert.ok(k);
  assert.equal(k.appName, 'Keynote 讲演');
});

test('构建号长度放宽：5-13 位可匹配', () => {
  const p = parseFilename('App 1.0.0 1234567890123.ipa');
  assert.ok(p);
  assert.equal(p.buildNumber, '1234567890123');
});

test('时间戳长度（14 位）内容不会被捕获为构建号', () => {
  const p = parseFilename('App 1.0.0 12345678901234.ipa');
  assert.ok(p);
  assert.notEqual(p.buildNumber, '12345678901234');
  assert.equal(p.timestamp, null);

  const q = parseFilename('企业微信 5.0.0(20200101000000).ipa');
  assert.equal(q.timestamp, '20200101000000');
  assert.equal(q.buildNumber, null);
});

test('无法解析的文件名返回 null', () => {
  assert.equal(parseFilename('badname.ipa'), null);
  assert.equal(parseFilename('abc.ipa'), null);
  assert.equal(parseFilename('README.md'), null);
});

test('扩展名大小写不敏感', () => {
  const p = parseFilename('Foo 1.0.0.IPA');
  assert.ok(p);
  assert.equal(p.suffix, '.IPA');
  assert.equal(buildTargetFilename(p), 'Foo 1.0.0.IPA');
});

test('tests/prepare.sh 中所有文件名均可解析', () => {
  assert.ok(SCRIPT_NAMES.length > 0, '脚本中应包含测试文件名');
  for (const name of SCRIPT_NAMES) {
    const p = parseFilename(name);
    assert.ok(p, '应可解析: ' + name);
    const target = buildTargetFilename(p);
    assert.ok(!target.includes('('), '目标文件名不应包含时间戳: ' + target);
    assert.ok(target.endsWith('.ipa'), '目标文件名应以 .ipa 结尾: ' + target);
  }
});
