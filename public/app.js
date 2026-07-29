const i18n = {
  zh: {
    activeSlot: '当前启用槽位',
    availableMaps: '可用地图',
    backups: '备份',
    dryRun: '模拟执行',
    emptyBackups: '暂无备份',
    emptyMaps: '没有扫描到可用地图',
    mapSelected: '已选择地图',
    mapsDir: '地图目录',
    openFolder: '打开目录',
    operationQueue: '执行队列',
    ready: '准备就绪',
    refresh: '刷新',
    releaseBoundaryText: '仓库只包含工具源码，不内置或分发任何 Dota 地图文件。',
    releaseBoundaryTitle: '开源发布边界',
    replacementFile: '准备替换为',
    restore: '恢复备份',
    restored: '已恢复备份',
    scan: '扫描',
    scanned: '扫描完成',
    slotFile: '槽位文件名',
    stepBackup: '创建时间戳备份',
    stepClose: '检查 Dota 是否关闭',
    stepRecord: '写入可恢复记录',
    stepSwap: '交换地图文件名',
    switchDone: '替换完成，重新进入游戏后生效',
    revertedPrevious: '已先恢复上一次替换',
    switchMap: '一键替换地图',
    dryRunDone: '模拟执行完成，没有改动任何文件',
    compatibility: '兼容性',
    chatBinds: '喊话绑定',
    cfgFile: '配置文件',
    predictionKey: '预测按键',
    abandonKey: '逃跑按键',
    predictionMessages: '预测喊话',
    abandonMessages: '逃跑恶搞喊话',
    applyChatBinds: '写入 CFG',
    previewCfg: '预览',
    removeChatBinds: '移除',
    chatBindEnabled: '已写入',
    chatBindMissing: '未写入',
    cfgHint: '每一行会生成一条 say；为避免误执行命令，内容不允许包含英文分号或引号。',
    chatBindSaved: '喊话绑定已写入，重启游戏后生效',
    chatBindPreview: 'CFG 预览',
    chatBindRemoved: '喊话绑定已移除',
    chatBindNoChange: 'CFG 已是最新',
    autoDetect: '自动检测',
    actualMap: '当前实际地图',
    activeStateNone: '未检测到 Dota Map 交换记录，当前按槽位文件名识别。',
    activeStateActive: '检测到 {actual} 正在通过 {slot} 槽位启用；再次替换会先自动恢复这次交换。',
    activeStateOfficial: '旧交换记录已经不再生效，文件内容看起来已回到原始槽位，记录已自动忽略。',
    activeStateStale: '检测到 Steam 更新或手动改动，旧交换记录已自动忽略；当前按槽位文件名重新识别。',
    activeStateInvalid: '旧交换记录不完整或备份缺失，软件已停止信任该记录。',
    staleSwapSkipped: '已忽略过期旧交换记录'
  },
  en: {
    activeSlot: 'Active slot',
    availableMaps: 'Available maps',
    backups: 'Backups',
    dryRun: 'Dry run',
    emptyBackups: 'No backups yet',
    emptyMaps: 'No terrain maps found',
    mapSelected: 'Selected map',
    mapsDir: 'Maps directory',
    openFolder: 'Open folder',
    operationQueue: 'Operation queue',
    ready: 'Ready',
    refresh: 'Refresh',
    releaseBoundaryText: 'The repository contains source only. No Dota map files are bundled or redistributed.',
    releaseBoundaryTitle: 'Public release boundary',
    replacementFile: 'Replacement file',
    restore: 'Restore backup',
    restored: 'Backup restored',
    scan: 'Scan',
    scanned: 'Scan complete',
    slotFile: 'Slot file name',
    stepBackup: 'Create timestamped backup',
    stepClose: 'Check Dota is closed',
    stepRecord: 'Write restore record',
    stepSwap: 'Swap map filenames',
    switchDone: 'Switch complete. Re-enter the game to see it.',
    revertedPrevious: 'Previous switch was restored first',
    switchMap: 'Switch map',
    dryRunDone: 'Dry run complete. No files were changed.',
    compatibility: 'Compatibility',
    chatBinds: 'Chat binds',
    cfgFile: 'CFG file',
    predictionKey: 'Prediction key',
    abandonKey: 'Abandon key',
    predictionMessages: 'Prediction chat',
    abandonMessages: 'Abandon prank chat',
    applyChatBinds: 'Write CFG',
    previewCfg: 'Preview',
    removeChatBinds: 'Remove',
    chatBindEnabled: 'Written',
    chatBindMissing: 'Missing',
    cfgHint: 'Each line becomes one say command. To avoid accidental command execution, quotes and semicolons are blocked.',
    chatBindSaved: 'Chat binds written. Restart the game to apply them.',
    chatBindPreview: 'CFG preview',
    chatBindRemoved: 'Chat binds removed',
    chatBindNoChange: 'CFG is already up to date',
    autoDetect: 'Auto detect',
    actualMap: 'Actual map',
    activeStateNone: 'No Dota Map swap record was found. The current map is identified by slot filename.',
    activeStateActive: '{actual} is currently enabled through the {slot} slot. The next switch will restore this swap first.',
    activeStateOfficial: 'The old swap record is no longer active. File contents appear to be back in their original slots, so the record was ignored.',
    activeStateStale: 'A Steam update or manual change was detected. The old swap record was ignored and the slot is identified by filename again.',
    activeStateInvalid: 'The old swap record is incomplete or its backup is missing. The app no longer trusts it.',
    staleSwapSkipped: 'Ignored stale previous swap record'
  }
};

const state = {
  lang: 'zh',
  maps: [],
  backups: [],
  sourceFile: '',
  slotFile: '',
  mapsDir: '',
  activeSwap: {
    status: 'none',
    active: false
  },
  chatBind: {
    cfgPath: '',
    managedBlockExists: false,
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
  }
};

const elements = {
  activeStateBox: document.getElementById('activeStateBox'),
  activeStateText: document.getElementById('activeStateText'),
  actualMapTitle: document.getElementById('actualMapTitle'),
  abandonKey: document.getElementById('abandonKey'),
  abandonMessages: document.getElementById('abandonMessages'),
  applyChatBindsBtn: document.getElementById('applyChatBindsBtn'),
  backupCount: document.getElementById('backupCount'),
  backupSelect: document.getElementById('backupSelect'),
  cfgPath: document.getElementById('cfgPath'),
  chatBindStatus: document.getElementById('chatBindStatus'),
  compatibilityBox: document.getElementById('compatibilityBox'),
  dryRunBtn: document.getElementById('dryRunBtn'),
  langEn: document.getElementById('langEn'),
  langZh: document.getElementById('langZh'),
  mapCount: document.getElementById('mapCount'),
  mapList: document.getElementById('mapList'),
  mapsDir: document.getElementById('mapsDir'),
  messageBox: document.getElementById('messageBox'),
  openFolderBtn: document.getElementById('openFolderBtn'),
  predictionKey: document.getElementById('predictionKey'),
  predictionMessages: document.getElementById('predictionMessages'),
  previewChatBindsBtn: document.getElementById('previewChatBindsBtn'),
  refreshBackupsBtn: document.getElementById('refreshBackupsBtn'),
  removeChatBindsBtn: document.getElementById('removeChatBindsBtn'),
  restoreBtn: document.getElementById('restoreBtn'),
  scanBtn: document.getElementById('scanBtn'),
  slotSelect: document.getElementById('slotSelect'),
  slotTitle: document.getElementById('slotTitle'),
  slotArt: document.getElementById('slotArt'),
  sourceArt: document.getElementById('sourceArt'),
  sourceSelect: document.getElementById('sourceSelect'),
  statusBadge: document.getElementById('statusBadge'),
  switchBtn: document.getElementById('switchBtn')
};

function t(key) {
  return i18n[state.lang][key] || key;
}

function setMessage(text, mode = '') {
  elements.messageBox.textContent = text;
  elements.messageBox.className = `message-box ${mode}`.trim();
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const json = await response.json();
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${response.status}`);
  }
  return json;
}

function localizedLabel(map) {
  return map.label[state.lang] || map.label.en || map.fileName;
}

function mapByFile(fileName) {
  return state.maps.find((map) => map.fileName === fileName);
}

function labelForFile(fileName) {
  const map = mapByFile(fileName);
  return map ? localizedLabel(map) : fileName || '';
}

function localizedCompatibility(map) {
  return {
    label: map?.compatibility?.label?.[state.lang] || map?.compatibility?.label?.en || '',
    reason: map?.compatibility?.reason?.[state.lang] || map?.compatibility?.reason?.en || '',
    ranked: map?.compatibility?.ranked || 'caution'
  };
}

function artClass(fileName) {
  const lower = (fileName || '').toLowerCase();
  if (lower.includes('winter')) return 'winter-art';
  if (lower.includes('halloween')) return 'halloween-art';
  if (lower.includes('autumn')) return 'autumn-art';
  if (lower.includes('desert')) return 'desert-art';
  if (lower.includes('spring')) return 'spring-art';
  return 'default-art';
}

function renderLanguage() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  elements.langZh.classList.toggle('active', state.lang === 'zh');
  elements.langEn.classList.toggle('active', state.lang === 'en');
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  elements.statusBadge.textContent = t('ready');
  renderChatBindStatus();
  renderActiveSwap();
}

function renderMaps() {
  elements.mapCount.textContent = String(state.maps.length);
  elements.mapList.innerHTML = '';
  elements.sourceSelect.innerHTML = '';
  elements.slotSelect.innerHTML = '';

  if (!state.maps.length) {
    const empty = document.createElement('div');
    empty.className = 'message-box';
    empty.textContent = t('emptyMaps');
    elements.mapList.append(empty);
    return;
  }

  for (const map of state.maps) {
    const sourceOption = document.createElement('option');
    sourceOption.value = map.fileName;
    sourceOption.textContent = `${localizedLabel(map)} - ${map.fileName}`;
    sourceOption.selected = map.fileName === state.sourceFile;
    elements.sourceSelect.append(sourceOption);

    const slotOption = document.createElement('option');
    slotOption.value = map.fileName;
    slotOption.textContent = `${localizedLabel(map)} - ${map.fileName}`;
    slotOption.selected = map.fileName === state.slotFile;
    elements.slotSelect.append(slotOption);

    const item = document.createElement('button');
    item.type = 'button';
    item.className = `map-item ${map.fileName === state.sourceFile ? 'active' : ''}`;
    const compatibility = localizedCompatibility(map);
    item.innerHTML = `
      <span class="thumb ${artClass(map.fileName)}"></span>
      <span>
        <span class="map-name">${localizedLabel(map)}</span>
        <span class="map-file">${map.fileName}</span>
        <span class="compatibility-chip ${compatibility.ranked}">${compatibility.label}</span>
      </span>
    `;
    item.addEventListener('click', () => {
      state.sourceFile = map.fileName;
      renderMaps();
      renderSelection();
      setMessage(`${t('mapSelected')}: ${localizedLabel(map)}`, 'ok');
    });
    elements.mapList.append(item);
  }
}

function renderSelection() {
  const slot = state.maps.find((map) => map.fileName === state.slotFile);
  const source = state.maps.find((map) => map.fileName === state.sourceFile);
  const actualSlotFile = actualFileForSlot(state.slotFile);
  const actualSlot = mapByFile(actualSlotFile) || slot;
  const compatibility = localizedCompatibility(source);
  elements.slotTitle.textContent = actualSlot ? localizedLabel(actualSlot) : 'Winter Slot';
  elements.sourceSelect.value = state.sourceFile;
  elements.slotSelect.value = state.slotFile;
  elements.slotArt.className = `terrain-art ${artClass(actualSlotFile || state.slotFile)}`;
  elements.sourceArt.className = `terrain-art ${artClass(state.sourceFile)}`;
  elements.compatibilityBox.className = `compatibility-box ${compatibility.ranked}`;
  elements.compatibilityBox.innerHTML = source
    ? `<strong>${t('compatibility')}: ${compatibility.label}</strong><p>${compatibility.reason}</p>`
    : '';
  renderActiveSwap();
}

function renderBackups() {
  elements.backupCount.textContent = String(state.backups.length);
  elements.backupSelect.innerHTML = '';
  if (!state.backups.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('emptyBackups');
    elements.backupSelect.append(option);
    return;
  }

  for (const backup of state.backups) {
    const option = document.createElement('option');
    option.value = backup.id;
    option.textContent = `${backup.createdAt} | ${backup.sourceFile} <-> ${backup.slotFile}`;
    elements.backupSelect.append(option);
  }
}

function actualFileForSlot(slotFile) {
  if (state.activeSwap?.active && state.activeSwap.slotFile === slotFile) {
    return state.activeSwap.sourceFile;
  }
  return slotFile;
}

function activeSwapMessage() {
  const activeSwap = state.activeSwap || { status: 'none' };
  const status = activeSwap.status || 'none';
  const actual = labelForFile(activeSwap.active ? activeSwap.sourceFile : state.slotFile);
  const slot = labelForFile(activeSwap.slotFile || state.slotFile);
  const messages = {
    none: t('activeStateNone'),
    active: t('activeStateActive').replace('{actual}', actual).replace('{slot}', slot),
    official: t('activeStateOfficial'),
    stale: t('activeStateStale'),
    invalid: t('activeStateInvalid')
  };
  return messages[status] || messages.invalid;
}

function renderActiveSwap() {
  if (!elements.activeStateBox) return;
  const status = state.activeSwap?.status || 'none';
  const actualSlotFile = actualFileForSlot(state.slotFile);
  const actualLabel = labelForFile(actualSlotFile);
  elements.activeStateBox.className = `active-state-box ${status}`.trim();
  elements.actualMapTitle.textContent = `${t('actualMap')}: ${actualLabel || t('autoDetect')}`;
  elements.activeStateText.textContent = activeSwapMessage();
}

function renderChatBindStatus() {
  elements.chatBindStatus.textContent = state.chatBind.managedBlockExists
    ? t('chatBindEnabled')
    : t('chatBindMissing');
}

function renderChatBinds() {
  elements.cfgPath.value = state.chatBind.cfgPath;
  elements.predictionKey.value = state.chatBind.predictionKey;
  elements.predictionMessages.value = state.chatBind.predictionMessages.join('\n');
  elements.abandonKey.value = state.chatBind.abandonKey;
  elements.abandonMessages.value = state.chatBind.abandonMessages.join('\n');
  renderChatBindStatus();
}

function textareaMessages(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectChatBindPayload(dryRun = false) {
  return {
    mapsDir: elements.mapsDir.value.trim(),
    cfgPath: elements.cfgPath.value.trim(),
    predictionKey: elements.predictionKey.value.trim(),
    predictionMessages: textareaMessages(elements.predictionMessages.value),
    abandonKey: elements.abandonKey.value.trim(),
    abandonMessages: textareaMessages(elements.abandonMessages.value),
    dryRun
  };
}

async function loadChatBinds() {
  state.mapsDir = elements.mapsDir.value.trim();
  const json = await requestJson(`/api/chat-binds?dir=${encodeURIComponent(state.mapsDir)}`);
  state.chatBind = {
    cfgPath: json.cfgPath,
    managedBlockExists: json.managedBlockExists,
    predictionKey: json.settings.predictionKey,
    predictionMessages: json.settings.predictionMessages,
    abandonKey: json.settings.abandonKey,
    abandonMessages: json.settings.abandonMessages
  };
  renderChatBinds();
}

async function applyChatBinds(dryRun = false) {
  const json = await requestJson('/api/chat-binds', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(collectChatBindPayload(dryRun))
  });

  if (dryRun) {
    setMessage(`${t('chatBindPreview')}:\n${json.block}`, 'ok');
    return;
  }

  state.chatBind.managedBlockExists = true;
  state.chatBind.cfgPath = json.cfgPath;
  state.chatBind.predictionKey = json.settings.predictionKey;
  state.chatBind.predictionMessages = json.settings.predictionMessages;
  state.chatBind.abandonKey = json.settings.abandonKey;
  state.chatBind.abandonMessages = json.settings.abandonMessages;
  renderChatBinds();
  setMessage(json.changed ? `${t('chatBindSaved')}: ${json.cfgPath}` : t('chatBindNoChange'), 'ok');
}

async function removeChatBinds() {
  const json = await requestJson('/api/chat-binds/remove', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mapsDir: elements.mapsDir.value.trim(),
      cfgPath: elements.cfgPath.value.trim()
    })
  });

  state.chatBind.managedBlockExists = false;
  renderChatBindStatus();
  setMessage(json.changed ? `${t('chatBindRemoved')}: ${json.cfgPath}` : t('chatBindNoChange'), 'ok');
}

async function scanMaps() {
  state.mapsDir = elements.mapsDir.value.trim();
  const json = await requestJson(`/api/maps?dir=${encodeURIComponent(state.mapsDir)}`);
  state.maps = json.maps;
  state.activeSwap = json.activeSwap || { status: 'none', active: false };
  if (!state.slotFile || !state.maps.some((map) => map.fileName === state.slotFile)) {
    state.slotFile = state.activeSwap.slotFile || state.maps.find((map) => map.fileName === 'dota_winter.vpk')?.fileName || state.maps[0]?.fileName || '';
  }
  const activeActualFile = actualFileForSlot(state.slotFile);
  if (
    !state.sourceFile ||
    !state.maps.some((map) => map.fileName === state.sourceFile) ||
    state.sourceFile === state.slotFile ||
    state.sourceFile === activeActualFile
  ) {
    state.sourceFile = state.maps.find((map) => map.fileName !== state.slotFile && map.fileName !== activeActualFile)?.fileName ||
      state.maps.find((map) => map.fileName !== state.slotFile)?.fileName ||
      state.maps[0]?.fileName ||
      '';
  }
  renderMaps();
  renderSelection();
  const scanMode = ['stale', 'invalid'].includes(state.activeSwap.status) ? 'warning' : 'ok';
  setMessage(`${t('scanned')}: ${state.maps.length}\n${activeSwapMessage()}`, scanMode);
  await loadBackups();
  await loadChatBinds();
}

async function loadBackups() {
  state.mapsDir = elements.mapsDir.value.trim();
  const json = await requestJson(`/api/backups?dir=${encodeURIComponent(state.mapsDir)}`);
  state.backups = json.backups;
  renderBackups();
}

async function runSwitch(dryRun) {
  const payload = {
    mapsDir: elements.mapsDir.value.trim(),
    sourceFile: state.sourceFile,
    slotFile: state.slotFile,
    dryRun
  };
  const json = await requestJson('/api/switch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (dryRun) {
    const statusNote = json.activeSwapStatus && json.activeSwapStatus.status !== 'none'
      ? `\n${json.activeSwapStatus.reason?.[state.lang] || activeSwapMessage()}`
      : '';
    setMessage(`${t('dryRunDone')}: ${json.plan.sourceFile} -> ${json.plan.slotFile}${statusNote}`, 'ok');
  } else {
    const prefix = json.revertedPrevious
      ? `${t('revertedPrevious')}. `
      : (json.skippedActiveSwap ? `${t('staleSwapSkipped')}. ` : '');
    setMessage(`${prefix}${t('switchDone')}. Backup: ${json.backupId}`, 'ok');
    await scanMaps();
  }
}

async function restoreSelectedBackup() {
  const backupId = elements.backupSelect.value;
  if (!backupId) return;
  const json = await requestJson('/api/restore', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mapsDir: elements.mapsDir.value.trim(),
      backupId
    })
  });
  setMessage(`${t('restored')}: ${json.restoredFiles.join(', ')}`, 'ok');
  await scanMaps();
}

async function openFolder() {
  const json = await requestJson('/api/open-folder', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mapsDir: elements.mapsDir.value.trim() })
  });
  setMessage(json.openedPath, 'ok');
}

function bindEvents() {
  elements.langZh.addEventListener('click', () => {
    state.lang = 'zh';
    renderLanguage();
    renderMaps();
    renderSelection();
    renderBackups();
  });
  elements.langEn.addEventListener('click', () => {
    state.lang = 'en';
    renderLanguage();
    renderMaps();
    renderSelection();
    renderBackups();
  });
  elements.sourceSelect.addEventListener('change', () => {
    state.sourceFile = elements.sourceSelect.value;
    renderMaps();
    renderSelection();
  });
  elements.slotSelect.addEventListener('change', () => {
    state.slotFile = elements.slotSelect.value;
    renderSelection();
  });
  elements.scanBtn.addEventListener('click', () => scanMaps().catch((error) => setMessage(error.message, 'error')));
  elements.dryRunBtn.addEventListener('click', () => runSwitch(true).catch((error) => setMessage(error.message, 'error')));
  elements.switchBtn.addEventListener('click', () => runSwitch(false).catch((error) => setMessage(error.message, 'error')));
  elements.restoreBtn.addEventListener('click', () => restoreSelectedBackup().catch((error) => setMessage(error.message, 'error')));
  elements.refreshBackupsBtn.addEventListener('click', () => loadBackups().catch((error) => setMessage(error.message, 'error')));
  elements.openFolderBtn.addEventListener('click', () => openFolder().catch((error) => setMessage(error.message, 'error')));
  elements.applyChatBindsBtn.addEventListener('click', () => applyChatBinds(false).catch((error) => setMessage(error.message, 'error')));
  elements.previewChatBindsBtn.addEventListener('click', () => applyChatBinds(true).catch((error) => setMessage(error.message, 'error')));
  elements.removeChatBindsBtn.addEventListener('click', () => removeChatBinds().catch((error) => setMessage(error.message, 'error')));
}

async function init() {
  bindEvents();
  renderLanguage();
  const config = await requestJson('/api/config');
  elements.mapsDir.value = config.defaultMapsPath;
  await scanMaps();
}

init().catch((error) => setMessage(error.message, 'error'));
