const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createServer } = require('../src/server');

function makeTempMapsDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dota-map-server-test-'));
}

function writeFile(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content, 'utf8');
}

async function withServer(assertions) {
  const server = createServer({ processChecker: () => false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await assertions(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /api/config returns default configuration', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/config`);
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.appName, 'Dota Map');
    assert.equal(json.defaultLanguage, 'zh');
    assert.ok(json.defaultMapsPath.includes('dota 2 beta'));
  });
});

test('GET /api/maps scans a supplied maps directory', async () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter');
  writeFile(dir, 'dota_halloween.vpk', 'halloween');

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/maps?dir=${encodeURIComponent(dir)}`);
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json.maps.map((map) => map.fileName), ['dota_halloween.vpk', 'dota_winter.vpk']);
    assert.equal(json.activeSwap.status, 'none');
  });
});

test('GET /api/maps reports and clears stale active swap state', async () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter');
  writeFile(dir, 'dota_ti10.vpk', 'ti10');

  const server = createServer({ processChecker: () => false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fetch(`http://127.0.0.1:${port}/api/switch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mapsDir: dir,
        sourceFile: 'dota_ti10.vpk',
        slotFile: 'dota_winter.vpk'
      })
    });
    writeFile(dir, 'dota_winter.vpk', 'steam-reset-winter');
    writeFile(dir, 'dota_ti10.vpk', 'steam-reset-ti10');

    const response = await fetch(`http://127.0.0.1:${port}/api/maps?dir=${encodeURIComponent(dir)}`);
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.activeSwap.status, 'stale');
    assert.equal(json.activeSwap.cleared, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/switch supports dry run without changing files', async () => {
  const dir = makeTempMapsDir();
  writeFile(dir, 'dota_winter.vpk', 'winter');
  writeFile(dir, 'dota_halloween.vpk', 'halloween');

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/switch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mapsDir: dir,
        sourceFile: 'dota_halloween.vpk',
        slotFile: 'dota_winter.vpk',
        dryRun: true
      })
    });
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.dryRun, true);
    assert.equal(fs.readFileSync(path.join(dir, 'dota_winter.vpk'), 'utf8'), 'winter');
  });
});

test('GET and POST /api/chat-binds manage autoexec.cfg from a maps directory', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dota-map-server-cfg-test-'));
  const mapsDir = path.join(root, 'game', 'dota', 'maps');
  const cfgPath = path.join(root, 'game', 'dota', 'cfg', 'autoexec.cfg');
  fs.mkdirSync(mapsDir, { recursive: true });

  await withServer(async (baseUrl) => {
    const before = await fetch(`${baseUrl}/api/chat-binds?dir=${encodeURIComponent(mapsDir)}`);
    const beforeJson = await before.json();

    assert.equal(before.status, 200);
    assert.equal(beforeJson.exists, false);
    assert.equal(beforeJson.cfgPath, cfgPath);

    const response = await fetch(`${baseUrl}/api/chat-binds`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mapsDir,
        predictionKey: 'F9',
        predictionMessages: ['赢了赢了'],
        abandonKey: '-',
        abandonMessages: ['有人跑了']
      })
    });
    const json = await response.json();
    const content = fs.readFileSync(cfgPath, 'utf8');

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.match(content, /alias \+dota_map_prediction "say 赢了赢了"/);
    assert.match(content, /bind "F9" "\+dota_map_prediction"/);
    assert.match(content, /alias \+dota_map_abandon "say 有人跑了"/);
    assert.match(content, /bind "MINUS" "\+dota_map_abandon"/);
  });
});

test('GET / serves the Dota Map UI shell', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(html, /Dota Map/);
    assert.match(html, /app.js/);
    assert.match(html, /styles.css/);
  });
});

test('GET / can serve UI shell from embedded static assets', async () => {
  const server = createServer({
    staticAssets: {
      'index.html': Buffer.from('<!doctype html><title>Dota Map</title><script src="/app.js"></script>'),
      'app.js': Buffer.from('window.__dotaMapEmbedded = true;')
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();
    const scriptResponse = await fetch(`http://127.0.0.1:${port}/app.js`);
    const script = await scriptResponse.text();

    assert.equal(response.status, 200);
    assert.equal(scriptResponse.status, 200);
    assert.match(html, /Dota Map/);
    assert.match(script, /__dotaMapEmbedded/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
