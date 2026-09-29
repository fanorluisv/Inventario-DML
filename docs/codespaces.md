# Trabajar desde GitHub Codespaces

Este entorno crea una instalación de desarrollo independiente con Node.js 24 y PostgreSQL 16. No copia los datos ni las claves del equipo local.

## Abrir el entorno

En GitHub, abrir el repositorio → **Code → Codespaces → Create codespace on main**. La configuración `.devcontainer/devcontainer.json` instala Node.js, Docker y las dependencias del proyecto.

Si el Codespace ya existía, guardar y sincronizar primero los cambios propios, ejecutar `git pull --ff-only` y elegir **Codespaces: Rebuild Container** desde la paleta (`Ctrl+Shift+P`). Esperar a que termine la preparación.

## Iniciar y entrar

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

- Dependencias pendientes: `bash .devcontainer/preparar.sh`.
- PostgreSQL no inicia: `docker compose logs db`.
- API ocupada: detener la terminal anterior con `Ctrl+C` y volver a iniciar.
- Un puerto no aparece: añadir 5173 en **Ports** y abrir su enlace.

Referencias: [configuración de Node.js en Codespaces](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/setting-up-your-nodejs-project-for-codespaces), [reconstrucción y volúmenes](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace) y [hosts permitidos de Vite](https://v8.vite.dev/config/server-options).
