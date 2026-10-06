# Trabajar desde GitHub Codespaces

Este entorno crea una instalación de desarrollo independiente con Node.js 24 y PostgreSQL 16. No copia los datos ni las claves del equipo local.

## Abrir el entorno

En GitHub, abrir el repositorio → **Code → Codespaces → Create codespace on main**. La configuración `.devcontainer/devcontainer.json` instala Node.js, Docker y las dependencias del proyecto.

Si el Codespace ya existía, guardar y sincronizar primero los cambios propios, ejecutar `git pull --ff-only` y elegir **Codespaces: Rebuild Container** desde la paleta (`Ctrl+Shift+P`). Esperar a que termine la preparación.

## Iniciar y entrar

El entorno inicia la aplicación automáticamente en segundo plano mediante `postStartCommand`.
Para activar el mismo arranque en un Codespace existente después de actualizar el código:

```bash
bash .devcontainer/iniciar-automatico.sh
```

Si hay un inicio manual activo, detener primero su terminal con `Ctrl+C`.
Consultar el arranque con `tail -n 60 .runtime/codespaces.log`.
Para registrar el nuevo `postStartCommand` en un entorno existente, usar **Codespaces: Rebuild Container** (sin **Full Rebuild**) después de guardar un respaldo y las claves privadas.
El inicio en segundo plano no depende de mantener abierta una terminal. Codespaces sigue
suspendiéndose por inactividad; al volver a iniciar el entorno, el hook arranca la aplicación.
La disponibilidad continua requiere desplegar en un servidor permanente.

En la terminal del Codespace:

```bash
bash iniciar-codespaces.sh
```

El comando inicia PostgreSQL, espera a que esté disponible, crea un respaldo y arranca API e interfaz. Mantener esta terminal abierta. En **Ports / Puertos**, abrir el enlace del puerto **5173** y conservar su visibilidad **Private / Privado**. La API se utiliza mediante el proxy de la interfaz; no hace falta publicar 3001 ni 5433.

En otra terminal, crear el administrador de esta base una sola vez:

```bash
bash crear-admin-codespaces.sh
```

Introducir nombre, correo y una contraseña propia de al menos 12 caracteres. La contraseña no se muestra ni se guarda en el historial de comandos. Después ingresar en la aplicación con ese correo y contraseña. Si ya hay un administrador, el asistente no lo reemplaza.

## Variables y persistencia

La preparación crea `.env` y `backend/.env` con permisos restringidos. La contraseña de PostgreSQL coincide con `DATABASE_URL`; `JWT_SECRET` y `CREDENTIALS_KEY` son aleatorias. `FRONTEND_ORIGIN` corresponde al enlace de este Codespace. Los dos archivos están excluidos de Git.

Si ambos archivos existen, se conservan íntegros. Si solo existe uno, la preparación se detiene para evitar cambiar claves de una base existente. No borrar ni regenerar `CREDENTIALS_KEY` si se guardaron credenciales cifradas.

PostgreSQL usa el volumen Docker `licencias_pgdata`. Detener y volver a iniciar la aplicación conserva los datos. Antes de eliminar el Codespace o realizar una reconstrucción completa (**Full Rebuild**), descargar un respaldo de `backups/` y conservar `backend/.env` de forma segura: la reconstrucción completa puede eliminar los volúmenes Docker. GitHub no conserva estos datos mediante commits.

Para crear un respaldo adicional mientras PostgreSQL está iniciado:

```bash
node backend/backup-operational.js --docker
```

## Solución de problemas

### El enlace `app.github.dev` muestra «page can’t be found»

El enlace del puerto depende de que el Codespace esté activo, la aplicación esté iniciada y el puerto esté reenviado. Crear el Codespace o publicar cambios en GitHub no inicia la aplicación: `postCreateCommand` solo prepara el entorno.

1. Abrir el Codespace desde GitHub con la cuenta que lo creó. Si se eliminó y se creó otro, usar el enlace del nuevo entorno.
2. En la terminal, desde la carpeta del proyecto, ejecutar `bash iniciar-codespaces.sh` y mantenerla abierta. Esperar a que Vite anuncie `http://127.0.0.1:5173/`. Si el comando termina con un error, resolver ese error primero: la interfaz se inicia después de PostgreSQL, el respaldo y la API.
3. En **Ports / Puertos**, añadir **5173** si no aparece. Usar **Open in Browser / Abrir en el navegador** para obtener el enlace vigente. Conservar la visibilidad **Private / Privado** e iniciar sesión en GitHub con la cuenta propietaria. El protocolo del puerto debe ser **HTTP**, porque Vite sirve HTTP internamente aunque el enlace externo sea HTTPS.

Para comprobar el arranque, ejecutar en otra terminal del Codespace:

```bash
curl --fail --show-error http://127.0.0.1:5173/ -o /dev/null
curl --fail --show-error http://127.0.0.1:3001/api/v1/salud
```

Si la primera comprobación falla, revisar la terminal de arranque: la interfaz no está disponible. Si ambas responden y el enlace externo falla, revisar el reenvío, el enlace vigente y la sesión de GitHub. Si aparece «Blocked request», reiniciar mediante `bash iniciar-codespaces.sh`, que autoriza el dominio exacto del Codespace en Vite.

- Dependencias pendientes: `bash .devcontainer/preparar.sh`.
- PostgreSQL no inicia: `docker compose logs db`.
- API ocupada: detener la terminal anterior con `Ctrl+C` y volver a iniciar.
- Un puerto no aparece: añadir 5173 en **Ports** y abrir su enlace.

Referencias: [configuración de Node.js en Codespaces](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/setting-up-your-nodejs-project-for-codespaces), [reconstrucción y volúmenes](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace) y [hosts permitidos de Vite](https://v8.vite.dev/config/server-options).
