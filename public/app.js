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
    compatibility: '兼容性'
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
    compatibility: 'Compatibility'
  }
};

const state = {
  lang: 'zh',
  maps: [],
  backups: [],
  sourceFile: '',
  slotFile: '',
  mapsDir: ''
};

const elements = {
  backupCount: document.getElementById('backupCount'),
  backupSelect: document.getElementById('backupSelect'),
  compatibilityBox: document.getElementById('compatibilityBox'),
  dryRunBtn: document.getElementById('dryRunBtn'),
  langEn: document.getElementById('langEn'),
  langZh: document.getElementById('langZh'),
  mapCount: document.getElementById('mapCount'),
  mapList: document.getElementById('mapList'),
  mapsDir: document.getElementById('mapsDir'),
  messageBox: document.getElementById('messageBox'),
  openFolderBtn: document.getElementById('openFolderBtn'),
  refreshBackupsBtn: document.getElementById('refreshBackupsBtn'),
  restoreBtn: document.getElementById('restoreBtn'),
  scanBtn: document.getElementById('scanBtn'),
  slotSelect: document.getElementById('slotSelect'),
  slotTitle: document.getElementById('slotTitle'),
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
  const compatibility = localizedCompatibility(source);
  elements.slotTitle.textContent = slot ? localizedLabel(slot) : 'Winter Slot';
  elements.sourceSelect.value = state.sourceFile;
  elements.slotSelect.value = state.slotFile;
  elements.sourceArt.className = `terrain-art ${artClass(state.sourceFile)}`;
  elements.compatibilityBox.className = `compatibility-box ${compatibility.ranked}`;
  elements.compatibilityBox.innerHTML = source
    ? `<strong>${t('compatibility')}: ${compatibility.label}</strong><p>${compatibility.reason}</p>`
    : '';
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

async function scanMaps() {
  state.mapsDir = elements.mapsDir.value.trim();
  const json = await requestJson(`/api/maps?dir=${encodeURIComponent(state.mapsDir)}`);
  state.maps = json.maps;
  if (!state.slotFile || !state.maps.some((map) => map.fileName === state.slotFile)) {
    state.slotFile = state.maps.find((map) => map.fileName === 'dota_winter.vpk')?.fileName || state.maps[0]?.fileName || '';
  }
  if (!state.sourceFile || !state.maps.some((map) => map.fileName === state.sourceFile) || state.sourceFile === state.slotFile) {
    state.sourceFile = state.maps.find((map) => map.fileName !== state.slotFile)?.fileName || state.maps[0]?.fileName || '';
  }
  renderMaps();
  renderSelection();
  setMessage(`${t('scanned')}: ${state.maps.length}`, 'ok');
  await loadBackups();
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
    setMessage(`${t('dryRunDone')}: ${json.plan.sourceFile} -> ${json.plan.slotFile}`, 'ok');
  } else {
    const prefix = json.revertedPrevious ? `${t('revertedPrevious')}. ` : '';
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
}

async function init() {
  bindEvents();
  renderLanguage();
  const config = await requestJson('/api/config');
  elements.mapsDir.value = config.defaultMapsPath;
  await scanMaps();
}

init().catch((error) => setMessage(error.message, 'error'));
