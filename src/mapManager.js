const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DOTA_MAPS_PATH = 'E:\\steam\\steamapps\\common\\dota 2 beta\\game\\dota\\maps';
const BACKUP_DIR_NAME = '.dota-map-backups';

const EXCLUDED_VPK_NAMES = new Set([
  'blackmap.vpk',
  'creeptests.vpk',
  'dota.vpk',
  'dota_loadout.vpk',
  'dota_sfm.vpk',
  'dota_vr.vpk',
  'start.vpk'
]);

const EXCLUDED_PREFIXES = [
  'modular_library_',
  'test_',
  'tutorial_'
];

const LABELS = {
  'dota_autumn.vpk': { zh: '秋季地图', en: 'Autumn Terrain' },
  'dota_cavern.vpk': { zh: '岩洞地图', en: 'Cavern Terrain' },
  'dota_coloseum.vpk': { zh: '竞技场地图', en: 'Colosseum Terrain' },
  'dota_crownfall.vpk': { zh: '王冠陨落地图', en: 'Crownfall Terrain' },
  'dota_desert.vpk': { zh: '荒漠地图', en: 'Desert Terrain' },
  'dota_halloween.vpk': { zh: '万圣节地图', en: 'Halloween Terrain' },
  'dota_journey.vpk': { zh: '旅途地图', en: 'Journey Terrain' },
  'dota_jungle.vpk': { zh: '丛林地图', en: 'Jungle Terrain' },
  'dota_reef.vpk': { zh: '礁石地图', en: 'Reef Terrain' },
  'dota_spring.vpk': { zh: '春季地图', en: 'Spring Terrain' },
  'dota_summer.vpk': { zh: '夏季地图', en: 'Summer Terrain' },
  'dota_ti10.vpk': { zh: 'TI10 地图', en: 'TI10 Terrain' },
  'dota_winter.vpk': { zh: '冬季地图', en: 'Winter Terrain' }
};

function assertMapsDir(mapsDir) {
  if (!mapsDir || typeof mapsDir !== 'string') {
    throw new Error('Maps directory is required');
  }
  const resolved = path.resolve(mapsDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Maps directory does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Maps path is not a directory: ${resolved}`);
  }
  return resolved;
}

function assertVpkFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid VPK file name');
  }
  if (path.isAbsolute(fileName) || fileName !== path.basename(fileName)) {
    throw new Error('Invalid VPK file name');
  }
  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
    throw new Error('Invalid VPK file name');
  }
  if (!fileName.toLowerCase().endsWith('.vpk')) {
    throw new Error('Invalid VPK file name');
  }
  return fileName;
}

function isTerrainCandidate(fileName) {
  const lower = fileName.toLowerCase();
  if (!lower.endsWith('.vpk')) return false;
  if (EXCLUDED_VPK_NAMES.has(lower)) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => lower.startsWith(prefix))) return false;
  return lower.startsWith('dota');
}

function labelFor(fileName) {
  const lower = fileName.toLowerCase();
  if (LABELS[lower]) return LABELS[lower];
  const base = lower.replace(/\.vpk$/i, '').replace(/^dota[_-]?/i, '');
  const words = base.split(/[_-]+/).filter(Boolean);
  const title = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || fileName;
  return {
    zh: `${title} 地图`,
    en: `${title} Terrain`
  };
}

function scanMaps(mapsDir) {
  const dir = assertMapsDir(mapsDir);
  const maps = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(isTerrainCandidate)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((fileName) => {
      const filePath = path.join(dir, fileName);
      const stats = fs.statSync(filePath);
      return {
        fileName,
        label: labelFor(fileName),
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    });

  return { mapsDir: dir, maps };
}

function ensureFilesExist(mapsDir, sourceFile, slotFile) {
  const sourcePath = path.join(mapsDir, sourceFile);
  const slotPath = path.join(mapsDir, slotFile);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source map file does not exist: ${sourceFile}`);
  }
  if (!fs.existsSync(slotPath)) {
    throw new Error(`Slot map file does not exist: ${slotFile}`);
  }
  return { sourcePath, slotPath };
}

function makeBackupId(now = new Date()) {
  const stamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${stamp}-${suffix}`;
}

function planSwitch({ mapsDir, sourceFile, slotFile, backupId = makeBackupId() }) {
  const dir = assertMapsDir(mapsDir);
  const source = assertVpkFileName(sourceFile);
  const slot = assertVpkFileName(slotFile);
  if (source.toLowerCase() === slot.toLowerCase()) {
    throw new Error('Source and slot must be different');
  }

  const { sourcePath, slotPath } = ensureFilesExist(dir, source, slot);
  const tempFile = `.__dota_map_swap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.vpk`;
  const tempPath = path.join(dir, tempFile);
  const backupDir = path.join(dir, BACKUP_DIR_NAME, backupId);

  return {
    mapsDir: dir,
    sourceFile: source,
    slotFile: slot,
    sourcePath,
    slotPath,
    backupId,
    backupDir,
    manifestPath: path.join(backupDir, 'manifest.json'),
    operations: [
      { type: 'copy-backup', from: sourcePath, to: path.join(backupDir, source) },
      { type: 'copy-backup', from: slotPath, to: path.join(backupDir, slot) },
      { type: 'rename', from: slotPath, to: tempPath },
      { type: 'rename', from: sourcePath, to: slotPath },
      { type: 'rename', from: tempPath, to: sourcePath }
    ]
  };
}

function isDotaRunning() {
  if (process.platform !== 'win32') return false;
  try {
    const output = childProcess.execFileSync('tasklist.exe', [], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return /\bdota2?\.exe\b/i.test(output) || /\bdota2\b/i.test(output);
  } catch (error) {
    return false;
  }
}

function assertDotaClosed(processChecker = isDotaRunning) {
  if (processChecker()) {
    throw new Error('Dota appears to be running. Close the game before switching maps.');
  }
}

function createBackup(plan) {
  fs.mkdirSync(plan.backupDir, { recursive: true });
  fs.copyFileSync(plan.sourcePath, path.join(plan.backupDir, plan.sourceFile));
  fs.copyFileSync(plan.slotPath, path.join(plan.backupDir, plan.slotFile));

  const manifest = {
    id: plan.backupId,
    createdAt: new Date().toISOString(),
    mapsDir: plan.mapsDir,
    sourceFile: plan.sourceFile,
    slotFile: plan.slotFile,
    files: [
      {
        fileName: plan.sourceFile,
        originalPath: plan.sourcePath,
        backupRelativePath: path.join(BACKUP_DIR_NAME, plan.backupId, plan.sourceFile)
      },
      {
        fileName: plan.slotFile,
        originalPath: plan.slotPath,
        backupRelativePath: path.join(BACKUP_DIR_NAME, plan.backupId, plan.slotFile)
      }
    ]
  };

  fs.writeFileSync(plan.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

function switchMap({ mapsDir, sourceFile, slotFile, dryRun = false, processChecker = isDotaRunning }) {
  const plan = planSwitch({ mapsDir, sourceFile, slotFile });
  if (dryRun) {
    return { ok: true, dryRun: true, plan };
  }

  assertDotaClosed(processChecker);
  const manifest = createBackup(plan);
  fs.renameSync(plan.operations[2].from, plan.operations[2].to);
  fs.renameSync(plan.operations[3].from, plan.operations[3].to);
  fs.renameSync(plan.operations[4].from, plan.operations[4].to);

  return {
    ok: true,
    backupId: plan.backupId,
    manifest,
    operations: plan.operations
  };
}

function readManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function listBackups(mapsDir) {
  const dir = assertMapsDir(mapsDir);
  const backupRoot = path.join(dir, BACKUP_DIR_NAME);
  if (!fs.existsSync(backupRoot)) return [];

  return fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(backupRoot, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      try {
        const manifest = readManifest(manifestPath);
        return {
          id: manifest.id,
          createdAt: manifest.createdAt,
          sourceFile: manifest.sourceFile,
          slotFile: manifest.slotFile,
          fileCount: manifest.files.length
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function assertBackupId(backupId) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(backupId || '')) {
    throw new Error('Invalid backup id');
  }
  return backupId;
}

function restoreBackup({ mapsDir, backupId, processChecker = isDotaRunning }) {
  assertDotaClosed(processChecker);
  const dir = assertMapsDir(mapsDir);
  const id = assertBackupId(backupId);
  const manifestPath = path.join(dir, BACKUP_DIR_NAME, id, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest does not exist: ${id}`);
  }
  const manifest = readManifest(manifestPath);

  for (const file of manifest.files) {
    const fileName = assertVpkFileName(file.fileName);
    const backupPath = path.join(dir, file.backupRelativePath);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file is missing: ${fileName}`);
    }
    fs.copyFileSync(backupPath, path.join(dir, fileName));
  }

  return { ok: true, backupId: id, restoredFiles: manifest.files.map((file) => file.fileName) };
}

module.exports = {
  BACKUP_DIR_NAME,
  DEFAULT_DOTA_MAPS_PATH,
  isDotaRunning,
  listBackups,
  planSwitch,
  restoreBackup,
  scanMaps,
  switchMap
};
