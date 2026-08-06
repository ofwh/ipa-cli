'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../dist/index.js');

test('程序化 API（src/index.ts）导出完整', () => {
  const expected = [
    'classifyIpaFiles',
    'bundleIpaFiles',
    'classifyCommand',
    'bundleCommand',
    'parseFilename',
    'buildTargetFilename',
    'getExtension',
    'expandHome',
    'resolvePath',
    'parsePath',
    'findIpaFiles',
    'copyFile',
    'moveFile',
    'ensureDir',
    'assertDirectory',
    'assertFile',
    'removeEmptyDirs',
    'getBundleId',
    'parseFile',
    'logger',
    'setLogLevel',
    'getLogLevel',
    'toErrorMessage',
    'hasErrorCode',
  ];
  for (const key of expected) {
    assert.ok(key in api, '缺少导出: ' + key);
  }
});

test('程序化 API 与底层模块实现一致', () => {
  const { parseFilename } = require('../../dist/utils/filename.js');
  assert.equal(api.parseFilename, parseFilename);

  const { classifyIpaFiles } = require('../../dist/core/classifier.js');
  assert.equal(api.classifyIpaFiles, classifyIpaFiles);

  const { bundleIpaFiles } = require('../../dist/core/bundler.js');
  assert.equal(api.bundleIpaFiles, bundleIpaFiles);

  const { getBundleId } = require('../../dist/utils/bundle.js');
  assert.equal(api.getBundleId, getBundleId);
});

test('parseFile 可通过程序化 API 调用', () => {
  const info = api.parseFile('微信 8.0.33.ipa');
  assert.ok(info);
  assert.equal(info.appName, '微信');
  assert.equal(info.version, '8.0.33');
});
