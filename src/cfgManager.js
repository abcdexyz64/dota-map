const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { DEFAULT_DOTA_MAPS_PATH } = require('./mapManager');

const DEFAULT_DOTA_CFG_PATH = path.join(path.dirname(DEFAULT_DOTA_MAPS_PATH), 'cfg', 'autoexec.cfg');
const CFG_BACKUP_DIR_NAME = '.dota-map-cfg-backups';
const CHAT_BIND_START = '// Dota Map chat binds begin';
const CHAT_BIND_END = '// Dota Map chat binds end';

const DEFAULT_CHAT_BIND_SETTINGS = {
  predictionKey: 'F6',
  predictionMessages: [
    '已经预测他们队伍将取得胜利！',
    '已经连续2688次成功预测了胜利。'
  ],
  abandonKey: '-',
  abandonMessages: [
    'XXX由于长时间没有重连至游戏，系统判定他为逃跑。',
    '剩余玩家可以自由退出。'
  ]
};

function assertExistingDirectory(dirPath, label) {
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error(`${label} is required`);
  }
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`${label} is not a directory: ${resolved}`);
  }
  return resolved;
}

function defaultCfgPathForMapsDir(mapsDir) {
  const dir = assertExistingDirectory(mapsDir, 'Maps directory');
  const base = path.basename(dir).toLowerCase();
  const dotaDir = base === 'maps' ? path.dirname(dir) : dir;
  return path.join(dotaDir, 'cfg', 'autoexec.cfg');
}

function assertCfgPath(cfgPath) {
  if (!cfgPath || typeof cfgPath !== 'string') {
    throw new Error('CFG path is required');
  }
  const resolved = path.resolve(cfgPath);
  if (path.extname(resolved).toLowerCase() !== '.cfg') {
    throw new Error('CFG path must end with .cfg');
  }
  return resolved;
}

function resolveCfgPath({ mapsDir, cfgPath } = {}) {
  if (cfgPath) return assertCfgPath(cfgPath);
  if (mapsDir) return defaultCfgPathForMapsDir(mapsDir);
  return DEFAULT_DOTA_CFG_PATH;
}

function normalizeKey(key, label) {
  const normalized = String(key || '').trim();
  if (!normalized) {
    throw new Error(`${label} key is required`);
  }
  if (normalized.length > 32) {
    throw new Error(`${label} key is too long`);
  }
  if (!/^[A-Za-z0-9_+\-=,.\/\\[\]`']+$/.test(normalized)) {
    throw new Error(`${label} key contains unsupported characters`);
  }
  return normalized;
}

function normalizeMessages(messages, label) {
  const rawMessages = Array.isArray(messages)
    ? messages
    : String(messages || '').split(/\r?\n/);

  const normalized = rawMessages
    .map((message) => String(message || '').trim())
    .filter(Boolean);

  if (!normalized.length) {
    throw new Error(`${label} messages are required`);
  }

  for (const message of normalized) {
    if (message.length > 180) {
      throw new Error(`${label} message is too long`);
    }
    if (/[";\r\n]/.test(message)) {
      throw new Error(`${label} message cannot contain quotes, semicolons, or new lines`);
    }
    if (/[\u0000-\u001f\u007f]/.test(message)) {
      throw new Error(`${label} message contains control characters`);
    }
  }

  return normalized;
}

function normalizeChatBindSettings(options = {}) {
  const predictionKey = normalizeKey(
    options.predictionKey || DEFAULT_CHAT_BIND_SETTINGS.predictionKey,
    'Prediction'
  );
  const abandonKey = normalizeKey(
    options.abandonKey || DEFAULT_CHAT_BIND_SETTINGS.abandonKey,
    'Abandon'
  );

  if (predictionKey.toLowerCase() === abandonKey.toLowerCase()) {
    throw new Error('Prediction and abandon keys must be different');
  }

  return {
    predictionKey,
    predictionMessages: normalizeMessages(
      options.predictionMessages || DEFAULT_CHAT_BIND_SETTINGS.predictionMessages,
      'Prediction'
    ),
    abandonKey,
    abandonMessages: normalizeMessages(
      options.abandonMessages || DEFAULT_CHAT_BIND_SETTINGS.abandonMessages,
      'Abandon'
    )
  };
}

function quoteCfgArg(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function sayCommand(messages) {
  return messages.map((message) => `say ${message}`).join('; ');
}

function buildBindLine(key, messages) {
  return `bind ${quoteCfgArg(key)} ${quoteCfgArg(sayCommand(messages))}`;
}

function buildChatBindBlock(options = {}) {
  const settings = normalizeChatBindSettings(options);
  const lines = [
    CHAT_BIND_START,
    '// prediction',
    buildBindLine(settings.predictionKey, settings.predictionMessages),
    '// abandon',
    buildBindLine(settings.abandonKey, settings.abandonMessages),
    CHAT_BIND_END
  ];
  return {
    settings,
    block: `${lines.join('\n')}\n`
  };
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function replaceManagedBlock(content, block) {
  const start = content.indexOf(CHAT_BIND_START);
  const end = content.indexOf(CHAT_BIND_END);
  if (start !== -1 && end !== -1 && end > start) {
    const before = content.slice(0, start).replace(/[ \t]*$/, '');
    const after = content.slice(end + CHAT_BIND_END.length).replace(/^\s*/, '');
    return `${before}${before ? '\n\n' : ''}${block}${after ? `\n${after}` : ''}`;
  }

  const trimmed = content.replace(/\s*$/, '');
  return `${trimmed}${trimmed ? '\n\n' : ''}${block}`;
}

function removeManagedBlock(content) {
  const start = content.indexOf(CHAT_BIND_START);
  const end = content.indexOf(CHAT_BIND_END);
  if (start === -1 || end === -1 || end <= start) {
    return content;
  }
  const before = content.slice(0, start).replace(/[ \t]*$/, '');
  const after = content.slice(end + CHAT_BIND_END.length).replace(/^\s*/, '');
  if (before && after) return `${before}\n\n${after}`;
  return `${before}${after}`;
}

function makeCfgBackupPath(cfgPath) {
  const stamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const suffix = crypto.randomBytes(3).toString('hex');
  const backupDir = path.join(path.dirname(cfgPath), CFG_BACKUP_DIR_NAME);
  const backupName = `${path.basename(cfgPath, '.cfg')}-${stamp}-${suffix}.cfg`;
  return path.join(backupDir, backupName);
}

function backupExistingCfg(cfgPath, existingContent) {
  if (!fs.existsSync(cfgPath)) return null;
  const backupPath = makeCfgBackupPath(cfgPath);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, existingContent, 'utf8');
  return backupPath;
}

function parseSayMessages(command) {
  return String(command || '')
    .split(/\s*;\s*/)
    .map((part) => part.replace(/^say\s+/i, '').trim())
    .filter(Boolean);
}

function parseChatBindBlock(content) {
  const start = content.indexOf(CHAT_BIND_START);
  const end = content.indexOf(CHAT_BIND_END);
  if (start === -1 || end === -1 || end <= start) return null;

  const block = content.slice(start, end + CHAT_BIND_END.length);
  const result = {};
  let section = '';
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '// prediction') {
      section = 'prediction';
      continue;
    }
    if (trimmed === '// abandon') {
      section = 'abandon';
      continue;
    }
    const match = trimmed.match(/^bind\s+"([^"]+)"\s+"([^"]+)"$/i);
    if (!match || !section) continue;
    result[`${section}Key`] = match[1];
    result[`${section}Messages`] = parseSayMessages(match[2]);
  }

  if (!result.predictionKey || !result.abandonKey) return null;
  return result;
}

function getChatBindInfo({ mapsDir, cfgPath } = {}) {
  const resolvedCfgPath = resolveCfgPath({ mapsDir, cfgPath });
  const content = readTextIfExists(resolvedCfgPath);
  const parsed = parseChatBindBlock(content);
  return {
    ok: true,
    cfgPath: resolvedCfgPath,
    exists: fs.existsSync(resolvedCfgPath),
    managedBlockExists: Boolean(parsed),
    settings: {
      ...DEFAULT_CHAT_BIND_SETTINGS,
      ...(parsed || {})
    },
    markerStart: CHAT_BIND_START,
    markerEnd: CHAT_BIND_END,
    launchOptionHint: '+exec autoexec.cfg'
  };
}

function configureChatBinds({ mapsDir, cfgPath, dryRun = false, ...options } = {}) {
  const resolvedCfgPath = resolveCfgPath({ mapsDir, cfgPath });
  const { settings, block } = buildChatBindBlock(options);
  const existingContent = readTextIfExists(resolvedCfgPath);
  const nextContent = replaceManagedBlock(existingContent, block);
  const changed = nextContent !== existingContent;

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      cfgPath: resolvedCfgPath,
      changed,
      settings,
      block
    };
  }

  let backupPath = null;
  if (changed) {
    fs.mkdirSync(path.dirname(resolvedCfgPath), { recursive: true });
    backupPath = backupExistingCfg(resolvedCfgPath, existingContent);
    fs.writeFileSync(resolvedCfgPath, nextContent, 'utf8');
  }

  return {
    ok: true,
    cfgPath: resolvedCfgPath,
    changed,
    backupPath,
    settings,
    markerStart: CHAT_BIND_START,
    markerEnd: CHAT_BIND_END,
    launchOptionHint: '+exec autoexec.cfg'
  };
}

function removeChatBinds({ mapsDir, cfgPath, dryRun = false } = {}) {
  const resolvedCfgPath = resolveCfgPath({ mapsDir, cfgPath });
  const existingContent = readTextIfExists(resolvedCfgPath);
  const nextContent = removeManagedBlock(existingContent);
  const changed = nextContent !== existingContent;

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      cfgPath: resolvedCfgPath,
      changed
    };
  }

  let backupPath = null;
  if (changed) {
    fs.mkdirSync(path.dirname(resolvedCfgPath), { recursive: true });
    backupPath = backupExistingCfg(resolvedCfgPath, existingContent);
    fs.writeFileSync(resolvedCfgPath, nextContent, 'utf8');
  }

  return {
    ok: true,
    cfgPath: resolvedCfgPath,
    changed,
    backupPath
  };
}

module.exports = {
  CFG_BACKUP_DIR_NAME,
  CHAT_BIND_END,
  CHAT_BIND_START,
  DEFAULT_CHAT_BIND_SETTINGS,
  DEFAULT_DOTA_CFG_PATH,
  buildChatBindBlock,
  configureChatBinds,
  defaultCfgPathForMapsDir,
  getChatBindInfo,
  removeChatBinds
};
