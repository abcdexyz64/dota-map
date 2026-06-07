const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  ACTIVE_STATE_FILE,
  listBackups,
  planSwitch,
  restoreBackup,
  scanMaps,
  switchMap
} = require('../src/mapManager');

function makeTempMapsDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dota-map-test-'));
}

function writeFile(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content, 'utf8');
}

function readFile(dir, name) {
  return fs.readFileSync(path.join(dir, name), 'utf8');
}

test('scanMaps returns terrain-like vpk files with known labels first', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter');
  writeFile(dir, 'dota_halloween.vpk', 'halloween');
  writeFile(dir, 'dota.vpk', 'core map');
  writeFile(dir, 'tutorial_m1.vpk', 'tutorial');
  writeFile(dir, 'notes.txt', 'ignore');

  const result = scanMaps(dir);
  const names = result.maps.map((map) => map.fileName);

  assert.deepEqual(names, ['dota_halloween.vpk', 'dota_winter.vpk']);
  assert.equal(result.maps[0].label.zh, '万圣节地图');
  assert.equal(result.maps[1].label.en, 'Winter Terrain');
});

test('scanMaps gives readable labels to historical and premium terrain files', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_683.vpk', 'old map');
  writeFile(dir, 'dota_737.vpk', 'newer old map');
  writeFile(dir, 'dota_cavern.vpk', 'emerald abyss');
  writeFile(dir, 'dota_coloseum.vpk', 'immortal gardens');
  writeFile(dir, 'dota_jungle.vpk', 'overgrown empire');
  writeFile(dir, 'dota_ti10.vpk', 'sanctums');

  const labelsByFile = Object.fromEntries(
    scanMaps(dir).maps.map((map) => [map.fileName, map.label])
  );

  assert.equal(labelsByFile['dota_683.vpk'].zh, '历史地图 6.83');
  assert.equal(labelsByFile['dota_683.vpk'].en, 'Historical Map 6.83');
  assert.equal(labelsByFile['dota_737.vpk'].zh, '历史地图 7.37');
  assert.equal(labelsByFile['dota_cavern.vpk'].en, 'The Emerald Abyss');
  assert.equal(labelsByFile['dota_coloseum.vpk'].zh, 'Immortal Gardens（不朽庭院）');
  assert.equal(labelsByFile['dota_jungle.vpk'].en, 'Overgrown Empire');
  assert.equal(labelsByFile['dota_ti10.vpk'].zh, 'Sanctums of the Divine（神圣圣所）');
});

test('scanMaps marks historical maps as not ranked-compatible', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_683.vpk', 'old map');
  writeFile(dir, 'dota_737.vpk', 'newer old map');
  writeFile(dir, 'dota_winter.vpk', 'winter terrain');
  writeFile(dir, 'dota_coloseum.vpk', 'immortal gardens');

  const mapsByFile = Object.fromEntries(
    scanMaps(dir).maps.map((map) => [map.fileName, map])
  );

  assert.equal(mapsByFile['dota_683.vpk'].compatibility.ranked, 'unsafe');
  assert.equal(mapsByFile['dota_683.vpk'].compatibility.label.zh, '不能正常进天梯');
  assert.match(mapsByFile['dota_737.vpk'].compatibility.reason.zh, /旧版本主地图/);
  assert.equal(mapsByFile['dota_winter.vpk'].compatibility.ranked, 'safe');
  assert.equal(mapsByFile['dota_coloseum.vpk'].compatibility.label.en, 'Current-layout terrain');
});

test('planSwitch rejects path traversal and identical source and slot files', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter');

  assert.throws(
    () => planSwitch({ mapsDir: dir, sourceFile: '..\\evil.vpk', slotFile: 'dota_winter.vpk' }),
    /Invalid VPK file name/
  );

  assert.throws(
    () => planSwitch({ mapsDir: dir, sourceFile: 'dota_winter.vpk', slotFile: 'dota_winter.vpk' }),
    /Source and slot must be different/
  );
});

test('switchMap creates backup copies and swaps file contents by filename', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter-content');
  writeFile(dir, 'dota_halloween.vpk', 'halloween-content');

  const result = switchMap({
    mapsDir: dir,
    sourceFile: 'dota_halloween.vpk',
    slotFile: 'dota_winter.vpk',
    processChecker: () => false
  });

  assert.equal(result.ok, true);
  assert.equal(readFile(dir, 'dota_winter.vpk'), 'halloween-content');
  assert.equal(readFile(dir, 'dota_halloween.vpk'), 'winter-content');

  const manifestPath = path.join(dir, '.dota-map-backups', result.backupId, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.files.length, 2);
  assert.equal(fs.readFileSync(path.join(dir, manifest.files[0].backupRelativePath), 'utf8'), 'halloween-content');
});

test('switchMap dry run does not require Dota to be closed', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter-content');
  writeFile(dir, 'dota_halloween.vpk', 'halloween-content');

  const result = switchMap({
    mapsDir: dir,
    sourceFile: 'dota_halloween.vpk',
    slotFile: 'dota_winter.vpk',
    dryRun: true,
    processChecker: () => true
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(readFile(dir, 'dota_winter.vpk'), 'winter-content');
  assert.equal(fs.existsSync(path.join(dir, '.dota-map-backups')), false);
});

test('switchMap reverts the previous active swap before applying a new one', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter-content');
  writeFile(dir, 'dota_halloween.vpk', 'halloween-content');
  writeFile(dir, 'dota_desert.vpk', 'desert-content');

  const first = switchMap({
    mapsDir: dir,
    sourceFile: 'dota_halloween.vpk',
    slotFile: 'dota_winter.vpk',
    processChecker: () => false
  });

  assert.equal(readFile(dir, 'dota_winter.vpk'), 'halloween-content');
  assert.equal(readFile(dir, 'dota_halloween.vpk'), 'winter-content');

  const second = switchMap({
    mapsDir: dir,
    sourceFile: 'dota_desert.vpk',
    slotFile: 'dota_winter.vpk',
    processChecker: () => false
  });

  assert.equal(second.revertedPrevious.backupId, first.backupId);
  assert.equal(readFile(dir, 'dota_winter.vpk'), 'desert-content');
  assert.equal(readFile(dir, 'dota_desert.vpk'), 'winter-content');
  assert.equal(readFile(dir, 'dota_halloween.vpk'), 'halloween-content');

  const activeState = JSON.parse(fs.readFileSync(path.join(dir, ACTIVE_STATE_FILE), 'utf8'));
  assert.equal(activeState.backupId, second.backupId);
  assert.equal(activeState.sourceFile, 'dota_desert.vpk');
  assert.equal(activeState.slotFile, 'dota_winter.vpk');
});

test('restoreBackup restores files from a selected backup manifest', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter-content');
  writeFile(dir, 'dota_halloween.vpk', 'halloween-content');

  const switched = switchMap({
    mapsDir: dir,
    sourceFile: 'dota_halloween.vpk',
    slotFile: 'dota_winter.vpk',
    processChecker: () => false
  });

  writeFile(dir, 'dota_winter.vpk', 'changed-winter');
  writeFile(dir, 'dota_halloween.vpk', 'changed-halloween');

  const restored = restoreBackup({
    mapsDir: dir,
    backupId: switched.backupId,
    processChecker: () => false
  });

  assert.equal(restored.ok, true);
  assert.equal(readFile(dir, 'dota_winter.vpk'), 'winter-content');
  assert.equal(readFile(dir, 'dota_halloween.vpk'), 'halloween-content');
});

test('listBackups returns newest manifest entries', () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter-content');
  writeFile(dir, 'dota_halloween.vpk', 'halloween-content');

  const switched = switchMap({
    mapsDir: dir,
    sourceFile: 'dota_halloween.vpk',
    slotFile: 'dota_winter.vpk',
    processChecker: () => false
  });

  const backups = listBackups(dir);
  assert.equal(backups.length, 1);
  assert.equal(backups[0].id, switched.backupId);
  assert.equal(backups[0].sourceFile, 'dota_halloween.vpk');
  assert.equal(backups[0].slotFile, 'dota_winter.vpk');
});
