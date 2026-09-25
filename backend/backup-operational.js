const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

async function backup() {
  const url = new URL(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let major;
  try {
    const result = await pool.query('SHOW server_version_num');
    major = Math.floor(Number(result.rows[0].server_version_num) / 10000);
  } finally { await pool.end(); }
  const root = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const file = path.join(root, `inventario-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
  const local = `/usr/lib/postgresql/${major}/bin/pg_dump`;
  const projectClient = path.join(__dirname, '..', '.tools', `postgresql-${major}`, 'bin', 'pg_dump');
  let command = process.env.PG_DUMP || (fs.existsSync(local) ? local : fs.existsSync(projectClient) ? projectClient : 'pg_dump');
  let args = ['--format=custom', '--no-owner', '--no-acl'];
  if (process.argv.includes('--docker')) {
    // Only use the project's container if it matches the configured operational database.
    const config = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '..', '.env')));
    if (!['127.0.0.1','localhost'].includes(url.hostname) || (url.port || '5432') !== (config.POSTGRES_PORT || '5433') || decodeURIComponent(url.pathname.slice(1)) !== (config.POSTGRES_DB || 'licencias_dml')) throw new Error('La base configurada no coincide con el contenedor del proyecto. Usa pg_dump de la versión del servidor.');
    command = process.argv.includes('--sudo') ? 'sudo' : 'docker';
    args = [...(command === 'sudo' ? ['-n', 'docker'] : []), 'compose', 'exec', '-T', 'db', 'sh', '-c', 'pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"'];
  }
  const fd = fs.openSync(file, 'wx', 0o600);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: path.join(__dirname, '..'), env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password) }, stdio: ['ignore', fd, 'pipe'] });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve() : reject(new Error(`El respaldo falló (${code}). ${stderr.replaceAll(decodeURIComponent(url.password) || '__no_password__', '[oculto]')}`)));
    });
  } catch (error) { fs.closeSync(fd); fs.unlinkSync(file); throw error; }
  fs.closeSync(fd);
  if (fs.statSync(file).size === 0) throw new Error('El archivo de respaldo está vacío.');
  console.log(`Respaldo creado: ${file}`);
  return file;
}
if (require.main === module) backup().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { backup };
