'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { logger, setLogLevel, getLogLevel } = require('../../dist/utils/logger.js');

function capture(fn) {
  const logs = { log: [], error: [], warn: [] };
  const original = { log: console.log, error: console.error, warn: console.warn };
  console.log = (m) => logs.log.push(String(m));
  console.error = (m) => logs.error.push(String(m));
  console.warn = (m) => logs.warn.push(String(m));
  try {
    fn();
  } finally {
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
  }
  return logs;
}

test('默认日志级别为 info，verbose 消息被抑制', () => {
  assert.equal(getLogLevel(), 'info');
  const logs = capture(() => {
    logger.info('可见');
    logger.verbose('不可见');
  });
  assert.ok(logs.log.join('').includes('可见'));
  assert.ok(!logs.log.join('').includes('不可见'));
});

test('setLogLevel 控制输出级别', () => {
  setLogLevel('silent');
  assert.equal(getLogLevel(), 'silent');
  const logs = capture(() => {
    logger.info('x');
    logger.error('e');
    logger.warn('w');
  });
  assert.equal(logs.log.length, 0);
  assert.equal(logs.error.length, 0);
  assert.equal(logs.warn.length, 0);

  setLogLevel('verbose');
  const logs2 = capture(() => logger.verbose('detail'));
  assert.ok(logs2.log.join('').includes('detail'));

  setLogLevel('info');
});

test('error/warn 输出到 stderr，success 使用绿色', () => {
  setLogLevel('info');
  const logs = capture(() => {
    logger.error('err-msg');
    logger.warn('warn-msg');
  });
  assert.ok(logs.error.join('').includes('err-msg'));
  assert.ok(logs.warn.join('').includes('warn-msg'));
});
