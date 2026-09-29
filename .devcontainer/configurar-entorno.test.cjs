const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { configure } = require('./configurar-entorno.cjs');

test('genera secretos compatibles y no altera configuraciones existentes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dml-env-test-'));
  fs.mkdirSync(path.join(root, 'backend'));
  const env = { CODESPACES: 'true', CODESPACE_NAME: 'prueba-dml', GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev' };
  try {
    assert.throws(() => configure(root, {}), /exclusivo/);
    assert.equal(configure(root, env), true);
    const first = fs.readFileSync(path.join(root, '.env'), 'utf8');
    const backend = fs.readFileSync(path.join(root, 'backend/.env'), 'utf8');
    const pass = first.match(/POSTGRES_PASSWORD=(\w+)/)[1];
    assert.ok(backend.includes(`:${pass}@127.0.0.1:5433/`));
    assert.match(backend, /CREDENTIALS_KEY=[a-f0-9]{64}\n/);
    assert.match(backend, /JWT_SECRET=[a-f0-9]{64}\n/);
    assert.match(backend, /FRONTEND_ORIGIN=https:\/\/prueba-dml-5173.app.github.dev/);
    for (const file of ['.env', 'backend/.env']) assert.equal(fs.statSync(path.join(root, file)).mode & 0o777, 0o600);
    assert.equal(configure(root, env), false);
    assert.equal(fs.readFileSync(path.join(root, '.env'), 'utf8'), first);
    assert.equal(fs.readFileSync(path.join(root, 'backend/.env'), 'utf8'), backend);
    fs.unlinkSync(path.join(root, '.env'));
    assert.throws(() => configure(root, env), /incompleta/);
    assert.equal(fs.readFileSync(path.join(root, 'backend/.env'), 'utf8'), backend);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
