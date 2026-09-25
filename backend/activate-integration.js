const { backup } = require('./backup-operational');
const { pool, encrypt, decrypt } = require('./operational');
const { migrate, initialize, transaction } = require('./inventory-service');

async function activate() {
  // Stop the previous API before running this command, so no legacy writer stays active.
  try {
    const response = await fetch('http://127.0.0.1:3001/api/v1/salud', { signal: AbortSignal.timeout(2000) });
    if (response.ok) throw new Error('Detén la API del puerto 3001 antes de activar la integración.');
  } catch (error) { if (error.message.startsWith('Detén')) throw error; }
  const file = await backup();
  const before = (await pool.query('SELECT id,codigo FROM activos ORDER BY id')).rows;
  await migrate(pool);
  const result = await transaction(pool, client => initialize(client, encrypt, decrypt));
  const after = (await pool.query('SELECT id,codigo FROM activos ORDER BY id')).rows;
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('La comprobación de conservación de equipos no coincide. Revisa el respaldo.');
  console.log(JSON.stringify({ estado: 'integrado', equiposConservados: after.length, responsables: result.datos.responsables.length, revision: result.revision, respaldo: file }));
}
if (require.main === module) activate().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
