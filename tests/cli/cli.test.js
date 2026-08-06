'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const plist = require('plist');

const CLI = path.resolve(__dirname, '../../dist/bin/cli.js');
const PKG_VERSION = require('../../package.json').version;

/** 生成带 Info.plist 的假 IPA（ZIP 容器） */
function makeIpa(filePath, bundleId, appName = 'WeChat') {
  const zip = new AdmZip();
  zip.addFile(`Payload/${appName}.app/Info.plist`, plist.build({ CFBundleIdentifier: bundleId }));
  zip.writeZip(filePath);
}

/** 参考 tests/prepare.sh 的测试文件名 */
const TEST_FILES = [
  '微信 8.0.33.ipa',
  '微信 8.0.32(20200102000000).ipa',
  '京东 11.2.8 168328.ipa',
  '115 30.0.0.ipa',
  'QQ 8.9.88@com.tencent.qq.ipa',
  '1Password 7 7.10.2.ipa',
  '淘宝 10 10.2.3 168328(20200101000000)@com.taobao.ipa',
  'badname.ipa',
];

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipa-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** 生成测试目录：包含各类 ipa 文件与干扰文件 */
function seed(root) {
  fs.mkdirSync(path.join(root, 'in/sub'), { recursive: true });
  for (const name of TEST_FILES) {
    fs.writeFileSync(path.join(root, 'in', name), 'data');
  }
  fs.writeFileSync(path.join(root, 'in/sub/115生活 36.2.11(20200103000000).ipa'), 'data');
  fs.writeFileSync(path.join(root, 'in/notes.txt'), 'not an ipa');
}

/**
 * 以确定性环境启动真实 CLI 进程：
 * - 强制 FORCE_COLOR=0，避免继承外部颜色配置导致 ANSI 转义码混入输出、
 *   使内容断言（如 "Files processed: 8"）失败；断言仍校验真实输出文本。
 * - 透传调用方指定的 env（如 ~ 路径用例的 HOME 覆盖）。
 */
function runCli(args, options = {}) {
  return new Promise((resolve) => {
    const env = { ...process.env, ...(options.env || {}), FORCE_COLOR: '0' };
    execFile(process.execPath, [CLI, ...args], { ...options, env }, (error, stdout, stderr) => {
      resolve({
        code: error && typeof error.code === 'number' ? error.code : 0,
        stdout,
        stderr,
        output: stdout + stderr,
      });
    });
  });
}

test('--version 输出 package.json 版本号', async () => {
  const { code, stdout } = await runCli(['--version']);
  assert.equal(code, 0);
  assert.equal(stdout.trim(), PKG_VERSION);
});

test('--help 展示 classify 子命令', async () => {
  const { code, stdout } = await runCli(['--help']);
  assert.equal(code, 0);
  assert.ok(stdout.includes('classify'));
  assert.ok(stdout.includes('bundle'));
});

test('classify --dry-run：预览且不产生实际文件变更', async (t) => {
  const root = makeTempDir(t);
  seed(root);
  const { code, output } = await runCli(['classify', '-d', 'in', '--dry-run'], { cwd: root });

  assert.equal(code, 0);
  assert.ok(output.includes('Dry-run mode'), 'warn 级别提示输出到 stderr，需检查合并输出');
  assert.ok(output.includes('Files to process: 8'));
  assert.ok(output.includes('badname.ipa'), '应展示跳过的文件');
  assert.equal(fs.existsSync(path.join(root, 'Versions')), false, 'dry-run 不应创建输出目录');
  assert.equal(fs.existsSync(path.join(root, 'in/微信 8.0.33.ipa')), true, 'dry-run 不应移动文件');
});

test('classify -v --dry-run：verbose 输出解析详情', async (t) => {
  const root = makeTempDir(t);
  seed(root);
  const { code, stdout } = await runCli(['classify', '-d', 'in', '--dry-run', '-v'], { cwd: root });
  assert.equal(code, 0);
  assert.ok(stdout.includes('Parsed'), 'verbose 应输出 Parsed 解析详情');
});

test('classify 实际执行：移动、去时间戳、清理、跳过', async (t) => {
  const root = makeTempDir(t);
  seed(root);
  const { code, stdout } = await runCli(['classify', '-d', 'in'], { cwd: root });

  assert.equal(code, 0);
  assert.ok(stdout.includes('Files processed: 8'));
  assert.ok(stdout.includes('Skipped: 1'));

  const expect = [
    'Versions/微信/微信 8.0.33.ipa',
    'Versions/微信/微信 8.0.32.ipa',
    'Versions/京东/京东 11.2.8 168328.ipa',
    'Versions/115/115 30.0.0.ipa',
    'Versions/QQ/QQ 8.9.88@com.tencent.qq.ipa',
    'Versions/1Password/1Password 7 7.10.2.ipa',
    'Versions/淘宝/淘宝 10 10.2.3 168328@com.taobao.ipa',
    'Versions/115生活/115生活 36.2.11.ipa',
  ];
  for (const rel of expect) {
    assert.equal(fs.existsSync(path.join(root, rel)), true, '缺少: ' + rel);
  }
  assert.equal(fs.existsSync(path.join(root, 'in/badname.ipa')), true, '无法解析的文件应保留');
  assert.equal(fs.existsSync(path.join(root, 'in/notes.txt')), true, '非 ipa 文件不应被处理');
  assert.equal(fs.existsSync(path.join(root, 'in/微信 8.0.33.ipa')), false, '源文件应被移动');
});

test('classify -d . 处理 CLI 根目录与多层嵌套目录下的 ipa 文件', async (t) => {
  const root = makeTempDir(t);
  // 根目录与不同深度子目录各放置 ipa 文件（另含非 ipa 干扰文件）
  fs.writeFileSync(path.join(root, '微信 8.0.33.ipa'), 'data');
  fs.mkdirSync(path.join(root, 'dir1/dir2/dir3'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dir1/QQ 8.9.88.ipa'), 'data');
  fs.writeFileSync(path.join(root, 'dir1/dir2/京东 11.2.8 168328.ipa'), 'data');
  fs.writeFileSync(path.join(root, 'dir1/dir2/dir3/115 30.0.0.ipa'), 'data');
  fs.writeFileSync(path.join(root, 'notes.txt'), 'not an ipa');

  const { code, stdout } = await runCli(['classify', '-d', '.'], { cwd: root });

  assert.equal(code, 0);
  assert.ok(stdout.includes('Found 4 .ipa file(s)'), '应扫描到根目录与嵌套目录下的全部 ipa 文件');
  assert.ok(stdout.includes('Files processed: 4'));
  for (const rel of [
    'Versions/微信/微信 8.0.33.ipa',
    'Versions/QQ/QQ 8.9.88.ipa',
    'Versions/京东/京东 11.2.8 168328.ipa',
    'Versions/115/115 30.0.0.ipa',
  ]) {
    assert.equal(fs.existsSync(path.join(root, rel)), true, '缺少: ' + rel);
  }
  assert.equal(fs.existsSync(path.join(root, 'dir1')), false, '移动后嵌套空目录应被清理');
  assert.equal(fs.existsSync(path.join(root, 'notes.txt')), true, '非 ipa 文件不应被处理');
});

test('classify -c 复制模式：源文件保留', async (t) => {
  const root = makeTempDir(t);
  seed(root);
  const { code } = await runCli(['classify', '-d', 'in', '-c', '-o', 'copy-out'], { cwd: root });

  assert.equal(code, 0);
  assert.equal(fs.existsSync(path.join(root, 'in/微信 8.0.33.ipa')), true, '复制模式应保留源文件');
  assert.equal(fs.existsSync(path.join(root, 'copy-out/微信/微信 8.0.33.ipa')), true);
});

test('classify 无效目录：退出码 1 并输出错误', async (t) => {
  const root = makeTempDir(t);
  const { code, stderr } = await runCli(['classify', '-d', 'missing-dir'], { cwd: root });
  assert.equal(code, 1);
  assert.ok(stderr.includes('Error'), '应输出错误信息');
});

test('classify -d 支持 ~ 开头路径（HOME 环境变量）', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in'));
  fs.writeFileSync(path.join(root, 'in/微信 8.0.33.ipa'), 'data');

  const { code, stdout } = await runCli(['classify', '-d', '~/in', '--dry-run'], {
    cwd: root,
    env: { HOME: root },
  });
  assert.equal(code, 0);
  assert.ok(stdout.includes('Found 1 .ipa file(s)'), '~ 路径应解析为 HOME 下目录');
});

test('bundle -d 目录模式：递归重命名并跳过无 Bundle ID 的文件', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in/sub'), { recursive: true });
  makeIpa(path.join(root, 'in/微信 8.0.33.ipa'), 'com.tencent.xin');
  makeIpa(path.join(root, 'in/sub/QQ 8.9.88.ipa'), 'com.tencent.qq');
  fs.writeFileSync(path.join(root, 'in/badname.ipa'), 'not a zip');
  fs.writeFileSync(path.join(root, 'in/notes.txt'), 'not an ipa');

  const { code, stdout } = await runCli(['bundle', '-d', 'in'], { cwd: root });

  assert.equal(code, 0);
  assert.ok(stdout.includes('Found 3 .ipa file(s)'), '应扫描到目录及子目录下的全部 ipa 文件');
  assert.ok(stdout.includes('Files renamed: 2'));
  assert.ok(stdout.includes('Skipped: 1'));
  assert.equal(fs.existsSync(path.join(root, 'in/微信 8.0.33@com.tencent.xin.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'in/sub/QQ 8.9.88@com.tencent.qq.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'in/badname.ipa')), true, '无 Bundle ID 的文件应保留');
  assert.equal(fs.existsSync(path.join(root, 'in/notes.txt')), true, '非 ipa 文件不应被处理');
});

test('bundle -f 文件模式：重命名单个文件', async (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, '京东 11.2.8 168328.ipa');
  makeIpa(ipa, 'com.jd');

  const { code, stdout } = await runCli(['bundle', '-f', ipa], { cwd: root });

  assert.equal(code, 0);
  assert.ok(stdout.includes('Files renamed: 1'));
  assert.equal(fs.existsSync(ipa), false);
  assert.equal(fs.existsSync(path.join(root, '京东 11.2.8 168328@com.jd.ipa')), true);
});

test('bundle -f 已带 Bundle 命名的文件：按 classify 标签风格输出跳过', async (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, 'QQ 8.9.88@com.tencent.qq.ipa');
  makeIpa(ipa, 'com.tencent.qq');

  const { code, stdout } = await runCli(['bundle', '-f', ipa], { cwd: root });

  assert.equal(code, 0);
  assert.ok(stdout.includes('(skipped)'), '跳过文件应带 (skipped) 标签输出');
  assert.ok(stdout.includes('Skipped: 1'));
  assert.equal(fs.existsSync(ipa), true, '已带 Bundle 命名的文件不应重命名');
});

test('bundle -d -o 平铺输出到目标目录', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in/sub'), { recursive: true });
  makeIpa(path.join(root, 'in/微信 8.0.33.ipa'), 'com.tencent.xin');
  makeIpa(path.join(root, 'in/sub/QQ 8.9.88.ipa'), 'com.tencent.qq');

  const { code, stdout } = await runCli(['bundle', '-d', 'in', '-o', 'out'], { cwd: root });

  assert.equal(code, 0);
  assert.ok(stdout.includes('Files renamed: 2'));
  assert.equal(fs.existsSync(path.join(root, 'out/微信 8.0.33@com.tencent.xin.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'out/QQ 8.9.88@com.tencent.qq.ipa')), true, '子目录文件平铺输出');
  assert.equal(fs.existsSync(path.join(root, 'in/微信 8.0.33.ipa')), false, '源文件应被移动');
});

test('bundle -d -o --keep-dir 保留次级目录结构', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in/dir2/dir3'), { recursive: true });
  makeIpa(path.join(root, 'in/微信 8.0.33.ipa'), 'com.tencent.xin');
  makeIpa(path.join(root, 'in/dir2/dir3/QQ 8.9.88.ipa'), 'com.tencent.qq');

  const { code, stdout } = await runCli(['bundle', '-d', 'in', '-o', 'out', '--keep-dir'], { cwd: root });

  assert.equal(code, 0);
  assert.ok(stdout.includes('dir2/dir3/QQ 8.9.88@com.tencent.qq.ipa'), '日志应按相对输出目录展示路径');
  assert.equal(fs.existsSync(path.join(root, 'out/微信 8.0.33@com.tencent.xin.ipa')), true);
  assert.equal(fs.existsSync(path.join(root, 'out/dir2/dir3/QQ 8.9.88@com.tencent.qq.ipa')), true);
});

test('bundle --keep-dir=true 布尔值形式生效', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in/dir2'), { recursive: true });
  makeIpa(path.join(root, 'in/dir2/QQ 8.9.88.ipa'), 'com.tencent.qq');

  const { code } = await runCli(['bundle', '-d', 'in', '-o', 'out', '--keep-dir=true'], { cwd: root });

  assert.equal(code, 0);
  assert.equal(fs.existsSync(path.join(root, 'out/dir2/QQ 8.9.88@com.tencent.qq.ipa')), true, '=true 形式应保留目录结构');
});

test('bundle -f -o 输出到目标目录', async (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, '京东 11.2.8 168328.ipa');
  makeIpa(ipa, 'com.jd');

  const { code } = await runCli(['bundle', '-f', ipa, '-o', 'out'], { cwd: root });

  assert.equal(code, 0);
  assert.equal(fs.existsSync(path.join(root, 'out/京东 11.2.8 168328@com.jd.ipa')), true);
  assert.equal(fs.existsSync(ipa), false);
});

test('bundle --dry-run：预览且不重命名文件', async (t) => {
  const root = makeTempDir(t);
  const ipa = path.join(root, '微信 8.0.33.ipa');
  makeIpa(ipa, 'com.tencent.xin');

  const { code, output } = await runCli(['bundle', '-f', ipa, '--dry-run'], { cwd: root });

  assert.equal(code, 0);
  assert.ok(output.includes('Dry-run mode'), 'dry-run 提示应输出到 stderr，需检查合并输出');
  assert.ok(output.includes('微信 8.0.33@com.tencent.xin.ipa'));
  assert.equal(fs.existsSync(ipa), true, 'dry-run 不应重命名文件');
});

test('bundle 缺少 -d/-f 时报错并退出码 1', async (t) => {
  const root = makeTempDir(t);
  const { code, stderr } = await runCli(['bundle'], { cwd: root });
  assert.equal(code, 1);
  assert.ok(stderr.includes('Specify either --directory (-d) or --file (-f)'));
});

test('bundle 同时指定 -d 与 -f 时报错并退出码 1', async (t) => {
  const root = makeTempDir(t);
  fs.mkdirSync(path.join(root, 'in'));
  const ipa = path.join(root, 'in/a.ipa');
  makeIpa(ipa, 'com.test');
  const { code, stderr } = await runCli(['bundle', '-d', 'in', '-f', ipa], { cwd: root });
  assert.equal(code, 1);
  assert.ok(stderr.includes('not both'));
});

test('bundle 无效目录：退出码 1 并输出错误', async (t) => {
  const root = makeTempDir(t);
  const { code, stderr } = await runCli(['bundle', '-d', 'missing-dir'], { cwd: root });
  assert.equal(code, 1);
  assert.ok(stderr.includes('Error'), '应输出错误信息');
});

test('bundle -f 非 ipa 文件：退出码 1 并输出错误', async (t) => {
  const root = makeTempDir(t);
  fs.writeFileSync(path.join(root, 'notes.txt'), 'not an ipa');
  const { code, stderr } = await runCli(['bundle', '-f', 'notes.txt'], { cwd: root });
  assert.equal(code, 1);
  assert.ok(stderr.includes('Not an IPA file'));
});
