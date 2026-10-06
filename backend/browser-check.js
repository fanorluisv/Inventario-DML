// Browser smoke test against the disposable integration database only.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function browserCheck(base, password) {
  const executable = process.env.TEST_CHROME;
  if (!executable) return;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'inventario-browser-'));
  const child = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let socket;
  try {
    for (let i = 0; i < 100 && !fs.existsSync(path.join(profile, 'DevToolsActivePort')); i++) await delay(100);
    const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0; const pending = new Map(); const errors = [];
    socket.onmessage = event => { const r = JSON.parse(event.data); if (r.id) { pending.get(r.id)?.(r); pending.delete(r.id); } else if (r.method === 'Runtime.exceptionThrown') errors.push(r.params.exceptionDetails.text); };
    const command = (method, params = {}) => new Promise((resolve, reject) => { const seq = ++id; const timeout = setTimeout(() => { pending.delete(seq); reject(new Error(`Timeout ${method}`)); }, 10000); pending.set(seq, r => { clearTimeout(timeout); r.error ? reject(new Error(r.error.message)) : resolve(r.result); }); socket.send(JSON.stringify({ id: seq, method, params })); });
    const evaluate = async expression => { const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'Browser script failed'); return r.result.value; };
    async function until(expression) { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); } throw new Error(`No se cumplió: ${expression}`); }
    async function fill(name, value) {
      await evaluate(`(()=>{let el=document.querySelector('[name="${name}"]');if(el?.type==='hidden'&&el.previousElementSibling?.getAttribute('placeholder')==='dd/mm/aaaa')el=el.previousElementSibling;if(!el)throw Error('Campo ${name} ausente');Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
    }
    async function click(label) { await evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!el)throw Error('Botón ${label} ausente');if(el.disabled)throw Error('Botón deshabilitado: ${label}');el.click()})()`); }
    await command('Runtime.enable'); await command('Page.enable');
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await command('Page.navigate', { url: base });
    await until("!!document.querySelector('[name=email]')");
    await fill('email', 'admin@example.test'); await fill('password', password); await click('Ingresar');
    await until("document.body.textContent.includes('Todos los cambios guardados')");
    assert.equal(await evaluate("Object.keys(localStorage).filter(k=>k.startsWith('dml-demo:')).length"), 0);
    await click('Registrar equipo'); await until("!!document.querySelector('[name=serial]')");
    const originalOwner=await evaluate("[...document.querySelector('[name=owner]').options].map(o=>o.value).find(v=>v&&v!=='Sin asignar')");
    assert.ok(originalOwner);
    await fill('owner', originalOwner);
    await click('Crear nuevo responsable'); await fill('newOwnerName', 'Borrador cancelado');
    await click('Cancelar nuevo responsable');
    assert.equal(await evaluate("document.querySelector('[name=owner]').value"), originalOwner);
    await click('Crear nuevo responsable');
    await fill('newOwnerName', 'Responsable del navegador'); await fill('newOwnerIdentification', '009988');
    await fill('name', 'Equipo registrado en navegador'); await fill('serial', 'BROWSER-001'); await fill('ram', '16 GB');
    await click('Guardar equipo');
    await until("document.body.textContent.includes('Todos los cambios guardados') && document.body.textContent.includes('Equipo registrado en navegador')");
    await click('Licencias'); await click('Registrar licencia'); await until("!!document.querySelector('[name=product]')");
    await fill('product', 'Licencia del navegador'); await fill('quantity', '3'); await fill('acquired', '01/10/2026'); await click('Guardar licencia');
    await until("document.body.textContent.includes('Todos los cambios guardados') && document.body.textContent.includes('Licencia del navegador')");
    await evaluate("[...document.querySelectorAll('.license-group')].find(el=>el.textContent.includes('Licencia del navegador')).querySelector('.actions .secondary').click()");
    await until("!!document.querySelector('[name=product]')");
    assert.equal(await evaluate("document.querySelector('[name=acquired]').previousElementSibling.value"), '01/10/2026');
    await fill('acquired', '31/02/2026');
    assert.equal(await evaluate("document.querySelector('[name=acquired]').form.checkValidity()"), false);
    await fill('acquired', '01/09/2026'); await fill('expires', '01/09/2027');
    await click('Guardar licencia');
    await until("document.body.textContent.includes('Todos los cambios guardados') && document.body.textContent.includes('Licencia actualizada')");
    assert.ok((await evaluate('document.body.textContent')).includes('01/09/2026'));
    await click('Responsables');
    await until("document.body.textContent.includes('Nuevo responsable')");
    await click('Usuarios'); await until("document.body.textContent.includes('Usuarios y permisos')");
    await click('Credenciales'); await click('Abrir credenciales');
    assert.ok(!(await evaluate('document.body.textContent')).includes('secreto-no-visible-en-db'));
    await click('Cerrar sesión'); await until("!!document.querySelector('[name=email]')");
    await fill('email', 'admin@example.test'); await fill('password', password); await click('Ingresar');
    await until("document.body.textContent.includes('Todos los cambios guardados')");
    await click('Activos TI');
    await until("document.body.textContent.includes('Equipo registrado en navegador')");
    await click('Equipo registrado en navegador');
    assert.ok((await evaluate('document.body.textContent')).includes('16 GB'));
    assert.ok((await evaluate('document.body.textContent')).includes('Responsable del navegador'));
    await click('Editar equipo');
    await until("!!document.querySelector('[name=owner]')");
    assert.equal(await evaluate("document.querySelector('[name=owner]').value"), 'Responsable del navegador');
    await click('Cancelar');
    await click('Hoja de vida');
    await until("document.body.textContent.includes('Documento de inventario')");
    await command('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync('/tmp/inventario-integrado.png', Buffer.from(r.data, 'base64')));
    await click('Cerrar sesión'); await until("!!document.querySelector('[name=email]')");
    await fill('email', 'lector@example.test'); await fill('password', password); await click('Ingresar');
    await until("document.body.textContent.includes('Todos los cambios guardados')");
    const labels = await evaluate("[...document.querySelectorAll('nav button')].map(b=>b.textContent)");
    assert.ok(!labels.includes('Credenciales')); assert.ok(!labels.includes('Usuarios'));
    assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Registrar equipo')"), false);
    assert.deepEqual(errors, []);
  } finally {
    socket?.close();
    const closed = new Promise(resolve => child.once('close', resolve));
    child.kill('SIGTERM'); await closed;
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
module.exports = { browserCheck };
