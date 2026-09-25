# Entornos disponibles

## Inventario real

```bash
./iniciar-operacional.sh
```

Abrir http://127.0.0.1:5173/ . Consultar [backend-operativo.md](backend-operativo.md) para respaldo, permisos y funciones integradas.

## Maqueta de Activos TI

```bash
npm run dev --prefix frontend
```

Abrir http://127.0.0.1:5173/?demo . Sus datos son de demostración y permanecen en el navegador. No modifica PostgreSQL. Recorridos en [maqueta.md](maqueta.md).

## Copia para otra empresa

La carpeta `maqueta-otra-empresa` es independiente. Consultar su README; usa el puerto 5174 y únicamente datos de prueba.

## Archivos históricos

El prototipo SQLite, sus pruebas, el script de inicio antiguo y sus fuentes están archivados en [depurado](../depurado/README.md). Para iniciar el inventario actual usa `./iniciar-operacional.sh`.
