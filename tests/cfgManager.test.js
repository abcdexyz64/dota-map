const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  CFG_BACKUP_DIR_NAME,
  CHAT_BIND_END,
  CHAT_BIND_START,
  configureChatBinds,
  defaultCfgPathForMapsDir,
  getChatBindInfo,
  removeChatBinds
} = require('../src/cfgManager');

function makeTempDotaDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dota-map-cfg-test-'));
  const mapsDir = path.join(root, 'game', 'dota', 'maps');
  fs.mkdirSync(mapsDir, { recursive: true });
  return { root, mapsDir, cfgPath: path.join(root, 'game', 'dota', 'cfg', 'autoexec.cfg') };
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('defaultCfgPathForMapsDir resolves autoexec.cfg beside maps directory', () => {
  const { mapsDir, cfgPath } = makeTempDotaDir();

  assert.equal(defaultCfgPathForMapsDir(mapsDir), cfgPath);
});

test('configureChatBinds creates an autoexec.cfg managed block', () => {
  const { mapsDir, cfgPath } = makeTempDotaDir();

  const result = configureChatBinds({ mapsDir });
  const content = readUtf8(cfgPath);

  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.backupPath, null);
  assert.match(content, new RegExp(CHAT_BIND_START));
  assert.match(content, /alias \+dota_map_prediction "say 已经预测他们队伍将取得胜利！"/);
  assert.match(content, /alias -dota_map_prediction "say 已经连续6657次成功预测了胜利。"/);
  assert.match(content, /bind "KP_MULTIPLY" "\+dota_map_prediction"/);
  assert.match(content, /alias \+dota_map_abandon "say SurrenderAdvisor由于长时间没有重连至游戏，系统判定他为逃跑。"/);
  assert.match(content, /alias -dota_map_abandon "say 剩余玩家可以自由退出。"/);
  assert.match(content, /bind "MINUS" "\+dota_map_abandon"/);
  assert.match(content, new RegExp(CHAT_BIND_END));
});

test('configureChatBinds replaces only the managed block and backs up existing cfg', () => {
  const { mapsDir, cfgPath } = makeTempDotaDir();
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, 'echo user-before\n\n// Dota Map chat binds begin\nbind "F6" "say old"\n// Dota Map chat binds end\n\necho user-after\n', 'utf8');

  const result = configureChatBinds({
    mapsDir,
    predictionKey: 'F7',
    predictionMessages: ['第一句', '第二句'],
    abandonKey: 'KP_MINUS',
    abandonMessages: ['假装断线', '大家可以走了']
  });
  const content = readUtf8(cfgPath);

  assert.equal(result.changed, true);
  assert.ok(result.backupPath.endsWith('.cfg'));
  assert.equal(fs.existsSync(result.backupPath), true);
  assert.equal(path.basename(path.dirname(result.backupPath)), CFG_BACKUP_DIR_NAME);
  assert.match(content, /echo user-before/);
  assert.match(content, /echo user-after/);
  assert.match(content, /alias \+dota_map_prediction "say 第一句"/);
  assert.match(content, /alias -dota_map_prediction "say 第二句"/);
  assert.match(content, /bind "F7" "\+dota_map_prediction"/);
  assert.match(content, /alias \+dota_map_abandon "say 假装断线"/);
  assert.match(content, /alias -dota_map_abandon "say 大家可以走了"/);
  assert.match(content, /bind "KP_MINUS" "\+dota_map_abandon"/);
  assert.doesNotMatch(content, /say old/);
});

test('getChatBindInfo parses the managed block back into settings', () => {
  const { mapsDir } = makeTempDotaDir();
  configureChatBinds({
    mapsDir,
    predictionKey: 'F8',
    predictionMessages: ['A', 'B'],
    abandonKey: 'BACKSPACE',
    abandonMessages: ['C']
  });

  const info = getChatBindInfo({ mapsDir });

  assert.equal(info.managedBlockExists, true);
  assert.equal(info.settings.predictionKey, 'F8');
  assert.deepEqual(info.settings.predictionMessages, ['A', 'B']);
  assert.equal(info.settings.abandonKey, 'BACKSPACE');
  assert.deepEqual(info.settings.abandonMessages, ['C']);
});

test('getChatBindInfo parses press and release alias say messages', () => {
  const { mapsDir } = makeTempDotaDir();
  configureChatBinds({
    mapsDir,
    predictionKey: '*',
    predictionMessages: ['A', 'B'],
    abandonKey: '-',
    abandonMessages: ['D', 'E']
  });

  const info = getChatBindInfo({ mapsDir });

  assert.equal(info.settings.predictionKey, 'KP_MULTIPLY');
  assert.deepEqual(info.settings.predictionMessages, ['A', 'B']);
  assert.equal(info.settings.abandonKey, 'MINUS');
  assert.deepEqual(info.settings.abandonMessages, ['D', 'E']);
});

test('getChatBindInfo can read legacy release aliases with multiple say commands', () => {
  const { mapsDir, cfgPath } = makeTempDotaDir();
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, [
    CHAT_BIND_START,
    '// prediction',
    'alias +dota_map_prediction "say A"',
    'alias -dota_map_prediction "say B; say C"',
    'bind "KP_MULTIPLY" "+dota_map_prediction"',
    '// abandon',
    'alias +dota_map_abandon "say D"',
    'alias -dota_map_abandon "say E; say F"',
    'bind "MINUS" "+dota_map_abandon"',
    CHAT_BIND_END,
    ''
  ].join('\n'), 'utf8');

  const info = getChatBindInfo({ mapsDir });

  assert.equal(info.settings.predictionKey, 'KP_MULTIPLY');
  assert.deepEqual(info.settings.predictionMessages, ['A', 'B', 'C']);
  assert.equal(info.settings.abandonKey, 'MINUS');
  assert.deepEqual(info.settings.abandonMessages, ['D', 'E', 'F']);
});

test('configureChatBinds accepts asterisk as keypad multiply shortcut', () => {
  const { mapsDir, cfgPath } = makeTempDotaDir();

  const result = configureChatBinds({
    mapsDir,
    predictionKey: '*',
    predictionMessages: ['star key'],
    abandonKey: 'KP_MINUS',
    abandonMessages: ['minus key']
  });
  const content = readUtf8(cfgPath);

  assert.equal(result.settings.predictionKey, 'KP_MULTIPLY');
  assert.match(content, /alias \+dota_map_prediction "say star key"/);
  assert.match(content, /bind "KP_MULTIPLY" "\+dota_map_prediction"/);
  assert.match(content, /alias \+dota_map_abandon "say minus key"/);
  assert.match(content, /bind "KP_MINUS" "\+dota_map_abandon"/);
});

test('configureChatBinds maps main minus shortcut to MINUS key name', () => {
  const { mapsDir, cfgPath } = makeTempDotaDir();

  const result = configureChatBinds({
    mapsDir,
    predictionKey: 'F10',
    predictionMessages: ['prediction'],
    abandonKey: '-',
    abandonMessages: ['abandon']
  });
  const content = readUtf8(cfgPath);

  assert.equal(result.settings.abandonKey, 'MINUS');
  assert.match(content, /bind "MINUS" "\+dota_map_abandon"/);
});

test('removeChatBinds removes only the managed block and backs up existing cfg', () => {
  const { mapsDir, cfgPath } = makeTempDotaDir();
  configureChatBinds({ mapsDir });
  fs.appendFileSync(cfgPath, '\necho keep-me\n', 'utf8');

  const result = removeChatBinds({ mapsDir });
  const content = readUtf8(cfgPath);

  assert.equal(result.changed, true);
  assert.equal(fs.existsSync(result.backupPath), true);
  assert.doesNotMatch(content, new RegExp(CHAT_BIND_START));
  assert.match(content, /echo keep-me/);
});

test('configureChatBinds rejects unsafe keys and injected commands', () => {
  const { mapsDir } = makeTempDotaDir();

  assert.throws(
    () => configureChatBinds({ mapsDir, predictionKey: 'F6;quit' }),
    /unsupported characters/
  );
  assert.throws(
    () => configureChatBinds({ mapsDir, predictionMessages: ['hello; quit'] }),
    /cannot contain quotes/
  );
  assert.throws(
    () => configureChatBinds({ mapsDir, predictionMessages: ['one', 'two', 'three'] }),
    /supports up to 2 lines/
  );
  assert.throws(
    () => configureChatBinds({ mapsDir, predictionKey: 'F6', abandonKey: 'f6' }),
    /must be different/
  );
});
