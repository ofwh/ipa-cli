'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { toErrorMessage, hasErrorCode } = require('../../dist/utils/errors.js');

test('toErrorMessage 转换未知错误', () => {
  assert.equal(toErrorMessage(new Error('boom')), 'boom');
  assert.equal(toErrorMessage('plain'), 'plain');
  assert.equal(toErrorMessage(null), 'null');
  assert.equal(toErrorMessage(42), '42');
});

test('hasErrorCode 判断错误码', () => {
  const exdev = Object.assign(new Error('cross-device'), { code: 'EXDEV' });
  assert.equal(hasErrorCode(exdev, 'EXDEV'), true);
  assert.equal(hasErrorCode(new Error('other'), 'EXDEV'), false);
  assert.equal(hasErrorCode(null, 'EXDEV'), false);
  assert.equal(hasErrorCode('str', 'EXDEV'), false);
});
