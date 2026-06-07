const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = require('../package.json');

test('package.json declares Windows exe build inputs', () => {
  assert.equal(packageJson.scripts['package:exe'], 'powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-exe.ps1');
  assert.deepEqual(packageJson.pkg.assets, [
    'public/**/*',
    'assets/**/*'
  ]);
  assert.equal(packageJson.pkg.outputPath, 'dist/exe');
});

test('dota2map icon assets exist for exe and zip packaging', () => {
  for (const file of ['assets/dota2map.ico', 'assets/dota2map.png', 'assets/dota2map.svg']) {
    assert.equal(fs.existsSync(path.join(__dirname, '..', file)), true, `${file} is missing`);
  }
});
