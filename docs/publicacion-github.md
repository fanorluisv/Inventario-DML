# Protocolo de publicación en GitHub

## 1. Revisar el alcance

Publicar el código de LICENCIAS DML, documentación, esquemas SQL y archivos de dependencias. Mantener fuera de Git los archivos `.env`, bases, respaldos, documentos empresariales originales, archivos de `depurado/` y la maqueta de otra empresa. Los archivos locales se conservan.

## 2. Validar

Ejecutar la compilación, lint y pruebas descritas en el README. Registrar por separado las pruebas de integración omitidas por falta de una base desechable. Nunca utilizar la base operacional como base de pruebas.

## 3. Preparar Git

Inicializar la rama `main`, configurar la identidad confirmada del autor y revisar `git status --short` y `git diff --cached --stat`. Revisar los archivos que se incluirán para detectar secretos antes del primer commit. Comprobar con `git check-ignore` que las fuentes privadas quedan excluidas.

## 4. Identificar el destino

Confirmar la cuenta u organización y la URL del repositorio. Para uno nuevo se propone `licencias-dml`, privado. Autenticarse mediante GitHub CLI o la integración disponible; no incluir tokens en archivos del proyecto ni enviarlos por el chat.

## 5. Publicar

Crear el commit inicial después de la revisión. Si el repositorio remoto ya existe, comprobar primero sus ramas e historial para evitar sobrescrituras. Configurar `origin` con la URL confirmada y subir `main` sin usar `--force`.

## 6. Verificar

Comprobar que el hash de `HEAD` coincide con `refs/heads/main` del remoto, que el árbol local está limpio y que la visibilidad del repositorio es la elegida. Entregar el enlace y el hash publicados.

## Estado de esta preparación

Validación del 2026-09-25: compilación y lint correctos; seis archivos de pruebas del frontend aprobados. El comando de pruebas del backend terminó correctamente, pero su prueba de integración PostgreSQL requiere `TEST_INVENTORY_DATABASE_URL` y no se ejecutó sobre una base real en esta preparación.

Se comprobaron las exclusiones con `git check-ignore` y se revisaron patrones de tokens, claves privadas y contraseñas literales en los archivos candidatos. Las coincidencias revisadas corresponden a datos de pruebas y código del formulario.

Destino confirmado: https://github.com/fanorluisv/Inventario-DML.git. La consulta inicial del remoto no devolvió ramas. La publicación solo se considera completada cuando se verifica el commit en GitHub.
