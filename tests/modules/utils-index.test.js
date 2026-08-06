'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const utils = require('../../dist/utils/index.js');

test('utils 统一导出完整', () => {
  const expected = [
    'parseFilename',
    'buildTargetFilename',
    'getExtension',
    'findIpaFiles',
    'copyFile',
    'moveFile',
    'ensureDir',
    'assertDirectory',
    'removeEmptyDirs',
    'expandHome',
    'resolvePath',
    'parsePath',
    'parseFile',
    'logger',
    'setLogLevel',
    'getLogLevel',
    'toErrorMessage',
    'hasErrorCode',
  ];
  for (const key of expected) {
    assert.ok(key in utils, '缺少导出: ' + key);
  }
});
