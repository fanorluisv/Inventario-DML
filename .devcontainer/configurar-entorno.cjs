const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function configure(root, env = process.env) {
  if (env.CODESPACES !== 'true') throw new Error('Este configurador es exclusivo de Codespaces.');
  const files = [path.join(root, '.env'), path.join(root, 'backend/.env')];
  const present = files.map(file => fs.existsSync(file));
  if (present.every(Boolean)) return false;
  if (present.some(Boolean)) throw new Error('Configuración incompleta: revisa los dos archivos .env. No se modificó ninguna clave.');
  const random = () => crypto.randomBytes(32).toString('hex');
  const password = random();
  const host = `${env.CODESPACE_NAME}-5173.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`;
  if (!env.CODESPACE_NAME || !/^[a-zA-Z0-9.-]+$/.test(host)) throw new Error('No se pudo determinar el dominio del Codespace.');
  fs.writeFileSync(files[0], `POSTGRES_DB=licencias_dml\nPOSTGRES_USER=licencias_app\nPOSTGRES_PORT=5433\nPOSTGRES_PASSWORD=${password}\n`, { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(files[1], `PORT=3001\nDATABASE_URL=postgres://licencias_app:${password}@127.0.0.1:5433/licencias_dml\nJWT_SECRET=${random()}\nCREDENTIALS_KEY=${random()}\nFRONTEND_ORIGIN=https://${host}\n`, { flag: 'wx', mode: 0o600 });
  return true;
}
if (require.main === module) {
  try { console.log(configure(path.join(__dirname, '..')) ? 'Variables creadas con claves aleatorias.' : 'Se conservaron las variables y claves existentes.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { configure };
