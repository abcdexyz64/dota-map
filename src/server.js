const childProcess = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const {
  DEFAULT_DOTA_MAPS_PATH,
  listBackups,
  restoreBackup,
  scanMaps,
  switchMap
} = require('./mapManager');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DEFAULT_PORT = 17777;
const HOST = '127.0.0.1';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendError(res, error) {
  sendJson(res, 400, { ok: false, error: error.message || String(error) });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function staticFileFor(urlPath) {
  const requestPath = urlPath === '/' ? '/index.html' : urlPath;
  const decoded = decodeURIComponent(requestPath);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) return null;
  return resolved;
}

function serveStatic(req, res, urlPath) {
  const filePath = staticFileFor(urlPath);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'content-type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function openFolder(mapsDir) {
  const resolved = path.resolve(mapsDir || DEFAULT_DOTA_MAPS_PATH);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Maps directory does not exist: ${resolved}`);
  }
  if (process.platform === 'win32') {
    childProcess.execFile('explorer.exe', [resolved], () => {});
  }
  return resolved;
}

function createServer(options = {}) {
  const processChecker = options.processChecker;

  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${DEFAULT_PORT}`}`);

    try {
      if (req.method === 'GET' && requestUrl.pathname === '/api/config') {
        sendJson(res, 200, {
          ok: true,
          appName: 'Dota Map',
          defaultLanguage: 'zh',
          defaultMapsPath: DEFAULT_DOTA_MAPS_PATH
        });
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname === '/api/maps') {
        const mapsDir = requestUrl.searchParams.get('dir') || DEFAULT_DOTA_MAPS_PATH;
        sendJson(res, 200, { ok: true, ...scanMaps(mapsDir) });
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname === '/api/backups') {
        const mapsDir = requestUrl.searchParams.get('dir') || DEFAULT_DOTA_MAPS_PATH;
        sendJson(res, 200, { ok: true, backups: listBackups(mapsDir) });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/switch') {
        const body = await readJsonBody(req);
        sendJson(res, 200, switchMap({
          mapsDir: body.mapsDir,
          sourceFile: body.sourceFile,
          slotFile: body.slotFile,
          dryRun: Boolean(body.dryRun),
          processChecker
        }));
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/restore') {
        const body = await readJsonBody(req);
        sendJson(res, 200, restoreBackup({
          mapsDir: body.mapsDir,
          backupId: body.backupId,
          processChecker
        }));
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/open-folder') {
        const body = await readJsonBody(req);
        const openedPath = openFolder(body.mapsDir);
        sendJson(res, 200, { ok: true, openedPath });
        return;
      }

      if (req.method === 'GET') {
        serveStatic(req, res, requestUrl.pathname);
        return;
      }

      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed');
    } catch (error) {
      sendError(res, error);
    }
  });
}

function startServer({ port = DEFAULT_PORT, host = HOST, maxAttempts = 20 } = {}) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    function tryListen(nextPort) {
      const server = createServer();
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && attempt < maxAttempts) {
          attempt += 1;
          tryListen(nextPort + 1);
          return;
        }
        reject(error);
      });
      server.listen(nextPort, host, () => {
        const url = `http://localhost:${nextPort}`;
        resolve({ server, port: nextPort, host, url });
      });
    }

    tryListen(port);
  });
}

if (require.main === module) {
  startServer()
    .then(({ url }) => {
      console.log(`Dota Map is running at ${url}`);
      console.log('Press Ctrl+C to stop.');
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  createServer,
  startServer
};
