> Las pantallas de esta maqueta ya están integradas en la aplicación operacional. Para datos reales, consultar [backend-operativo.md](backend-operativo.md). Las notas históricas de este documento describen la evolución de la demostración.

# Maqueta navegable de Activos TI

Inicio desde la raíz del proyecto, con Node.js y npm disponibles:

```bash
npm run dev --prefix frontend -- --host 127.0.0.1
```

Abrir http://127.0.0.1:5173/?demo . No requiere iniciar la API. La dirección sin `?demo` abre el acceso operativo, que sí requiere la API; consultar [backend-operativo.md](backend-operativo.md). Detener con Ctrl+C.

Si Node no está disponible en esta terminal del equipo de desarrollo:

```bash
export PATH=/home/ph/.nvm/versions/node/v24.20.0/bin:$PATH
```

## Recorrido de revisión

1. Inicio: seleccionar una tarjeta de estado o una barra de responsable/ubicación para consultar sus equipos.
2. Activos TI: buscar, filtrar por estado y abrir una ficha.
3. Ficha: revisar adquisición, tiempo calculado desde adquisición, monitor y S/N; abrir Licencias asociadas e Historial de usuarios.
4. Registrar equipo: completar nombre, estado y los datos disponibles; guardar y consultar la ficha del nuevo equipo.
5. Responsables y Licencias: seleccionar un responsable o equipo asociado para navegar al inventario o ficha.
6. Reportes: filtrar el inventario y exportar los resultados a CSV.
7. Calidad de datos: revisar equipos sin fecha de adquisición o sin serial de pantalla.

## Alcance

Ocho equipos ficticios iniciales. Cambios en memoria: recargar restablece los datos. No utiliza ni modifica la base demo existente o los Markdown de inventario real. El historial es ilustrativo; las fechas desconocidas se muestran por confirmar. Incluye edición de equipos y eliminación confirmada de equipos sin asociaciones. No incorpora autenticación ni persistencia operativa. Las licencias de ejemplo tienen versión y vencimiento pendientes. La navegación ocurre dentro de la página, sin rutas independientes.

Comprobados: compilación TypeScript/Vite y lint. Servidor Vite iniciado correctamente en loopback. No se ha realizado inspección visual ni prueba automatizada en navegador. Esta maqueta no está desplegada en la red local ni en el NAS.

## Equipos, monitores y licencias separados

- Activos TI → Equipos: fecha de adquisición visible en tabla, formulario y ficha; tiempo de uso calculado desde ella.
- Activos TI → Monitores: cinco ejemplos externos con código propio. Registrar monitor, abrir su ficha y cambiar equipo o dejarlo disponible. El historial registra los movimientos de esta sesión.
- Equipo → Monitores asociados: consultar todos los monitores externos vinculados. Pantallas integradas permanecen en Información general.
- Licencias: cuatro registros iniciales independientes; filtrar por origen, registrar una licencia incluida o adquirida aparte y abrir su equipo. Se exige equipo para una licencia incluida. Ejemplos ficticios de Windows y Autodesk; las condiciones reales permanecen por confirmar.
- Equipo → Licencias asociadas: consultar los mismos registros, su origen y fechas.

La calidad de equipos ahora revisa adquisición y serial del equipo; la ausencia de un monitor externo no es por sí sola un dato incompleto. No se incluyen aún asignaciones de licencia por usuario ni validación de derechos. Todo sigue en memoria y se restablece al recargar.

## Observaciones y estado Regular

Registrar equipo permite escribir Observaciones; se conservan en la ficha y en el CSV durante la sesión. Regular está disponible en el formulario, filtros y tarjeta de Inicio (ejemplo DML-003), y en el registro de monitores. Su selección es manual. Registrar licencia incluye Serial y Observaciones opcionales, visibles en el listado y en Licencias asociadas del equipo.

Para comprar una pantalla sin equipo: Activos TI → Monitores → Registrar monitor. Completar marca, modelo, tamaño, serial, adquisición y estado; mantener “Disponible · Sin equipo asignado” y guardar. El código MON se genera automáticamente. Después se puede asociar desde la ficha del monitor.

## Corregir un registro de equipo

Activos TI → Equipos → abrir ficha → Editar equipo. El formulario precarga los datos; guardar actualiza el mismo código y conserva asociaciones. Cancelar vuelve a la ficha sin aplicar cambios.

Para una pantalla registrada por error como equipo: anotar sus datos, seleccionar Eliminar registro en la ficha y confirmar. La eliminación se bloquea si hay licencias o monitores asociados. Después entrar en Monitores → Registrar monitor y registrar la pantalla con código propio. Los códigos de equipo no se reutilizan en la sesión tras borrar.

Estas acciones representan el rol Administrador TI en la maqueta; todavía no hay autenticación ni control de permisos en servidor. Compilación y lint verificados; recorrido visual pendiente de revisión del usuario.

## Mantenimiento, disponibilidad y lotes — 2026-09-11

- Registrar o editar equipo: marca, tipo de tarjeta de video, Libre/Asignado y mantenimiento realizado Sí/No. Sin responsable se guarda Libre. Sí requiere fecha del último mantenimiento; No calcula el próximo desde adquisición. La ficha y tabla muestran el próximo mantenimiento semestral. Filtros Libres y Mantenimiento pendiente, y exportación con nuevos campos.
- Licencias: resumen adquirido/asignado/disponible por producto. Lotes de ejemplo AEC 9, Docs 10, AutoCAD 6, Antivirus 65. Registrar licencia acepta cantidad; cada unidad representa un cupo por equipo en la demostración.
- En cada lote seleccionar equipo y Asignar un cupo; comprobar contador y ficha del equipo. Liberar cupo devuelve el saldo. No permite duplicar equipo dentro del mismo lote ni superar capacidad. Windows incluido conserva vínculo al equipo y no ofrece liberación.
- Pruebas de reglas: `node --test frontend/src/inventoryRules.test.mjs` con Node 24. Comprueban ajuste de fecha a fin de mes, último cupo, duplicados y reasignación tras liberación.

El saldo disponible es numérico y las condiciones reales siguen pendientes. La maqueta aún no tiene persistencia operativa ni validación por usuario/contrato.

## Filtros por columna

Los encabezados de la tabla de equipos permiten combinar tipo, marca, video, responsable, disponibilidad, mantenimiento realizado y programación, ubicación, área, estado y año de adquisición. Ejemplo: Marca Dell + Disponibilidad Libre + Estado Regular. Limpiar filtros elimina selección y búsqueda; volver de la ficha mantiene filtros. El conteo y CSV de Reportes usan el mismo resultado. Opciones tomadas del inventario completo para poder cambiar selecciones aunque una combinación no tenga resultados.

## Códigos y credenciales — 2026-09-11

Códigos DML-TIPO-0001 por categoría, aprobados y aplicados a ejemplos y nuevos registros. El tipo queda fijo al editar. Equipos incluye tipos de red, cámara, grabador, impresora y UPS; aún usa formulario general. Monitores sigue en su pestaña.

Credenciales → Abrir vista de demostración → Registrar cuenta de prueba. Elegir Equipo/Correo/NAS, servicio, usuario/correo, clave ficticia y equipo o responsable (al menos uno). Tabla con claves enmascaradas y edición; Ocultar tabla vuelve a cerrar la vista. Cambiar de sección la cierra también. Estos campos no se exportan con equipos.

NO hay autenticación ni cifrado y ocultar no protege el contenido del navegador. El requisito de acceso exclusivo de administrador se implementará en servidor antes de recibir credenciales reales. Solo probar con valores ficticios. La tabla se mantiene en memoria y se vacía al recargar.

## Registro simultáneo de cuentas desde Licencias

Registrar licencia incluye los grupos Usuario de equipo / Clave de equipo, Usuario correo / Clave de correo y Usuario NAS / Clave de acceso NAS. Se pueden completar juntos. Cada grupo es opcional, pero si se completa un campo se exige su pareja y un equipo seleccionado. Guardar registra la licencia y las cuentas de prueba; estas se consultan y editan en Credenciales. Las claves se introducen en campos de contraseña y no aparecen en listados de licencias. Autenticación y cifrado siguen pendientes; no ingresar datos reales.

## Consultar las tres credenciales por responsable

Credenciales → Abrir vista de demostración → Seleccionar responsable. Aparecen juntas las secciones Acceso al equipo, Correo asignado y Acceso al NAS. Cada cuenta muestra usuario, clave enmascarada, equipo, servicio y Editar. Si hay varios accesos se muestran todos, sin sustituir unos por otros. Si falta uno, se indica y puede agregarse desde su sección con responsable y tipo precargados. Al guardar, la consulta vuelve al responsable de la cuenta. Cambiar responsable oculta las claves reveladas. Sin responsable asignado reúne cuentas pendientes de relación; no se infiere su propietario desde cambios posteriores del equipo.

## Responsables, actas y hoja de vida

1. Responsables: seleccionar persona, elegir tipo de documento y guardar número de identificación. El campo es texto para conservar ceros y documentos alfanuméricos.
2. Abrir equipo asignado → Acta de entrega. Requiere responsable con identificación. Completar fecha, ciudad, quien entrega, accesorios realmente entregados, destino, duración y programas instalados verificados. Las licencias son solo referencia y no se declaran automáticamente como instalaciones.
3. Generar acta para revisar. Incluye identificación, equipo, marca/modelo/serial, monitores externos con sus códigos y seriales; una laptop también incluye su pantalla integrada. Condiciones editables tomadas del texto proporcionado por Fanor, sin validación jurídica.
4. Imprimir / Guardar como PDF abre el diálogo de impresión del navegador. Seleccionar Guardar como PDF si se desea archivo. Imprime solo el documento, no las credenciales ni la interfaz.
5. Las actas anteriores quedan seleccionables durante la sesión con copia de datos al generar, aunque cambie luego el responsable o el equipo. No hay firma electrónica ni constancia de aceptación automática.
6. Hoja de vida: registrar fecha, tipo de evento, técnico y descripción. Los eventos se agregan sin sobrescribir el historial; mantenimiento realizado actualiza la fecha del equipo si es más reciente. Imprimir genera ficha técnica e historial.

No se permiten eventos/entregas anteriores a una adquisición conocida. Sin información se muestra Por confirmar. Equipos con actas o historial no pueden eliminarse en esta maqueta. Documentos llevan marca DEMOSTRACIÓN: todavía no hay almacenamiento permanente. Compilación y lint verificados; impresión/navegador pendientes de inspección visual.

## Modelos documentales DML integrados

Fuentes en la raíz: `ACTA DE ENTREGA-RESPONSABLE.md` (TI-F-04, UNO) y `01MI-F-03 V3 HOJA DE VIDA DEL ACTIVO.md` (MI-F-03, TRES), convertidas de sus PDF originales sin modificar estos. La exportación de hoja de vida estaba partida horizontalmente; los Markdown reconstruyen todas las columnas y conservan control de cambios/legibilidad.

El acta añade encabezado del modelo, autoriza, fechas de recibido/devolución, licencias y pie de referencia. Hoja de vida añade foto JPG/PNG hasta 3 MB, sección 1 de información, sección 4 de accesorios y sección 5 de mantenimiento. Registrar Accesorio permite indicar C/I y B/R/IN. Los mantenimientos incluyen MP/MC, proveedor, factura/OC, materiales, horas, costo COP, recibido y recomendaciones. Las tablas de mantenimiento se imprimen como bloques verticales para evitar cortes horizontales.

Las fotos y registros siguen en memoria. Logo representado por nombre de empresa; no hay reproducción gráfica exacta del PDF ni garantía de una sola página. Control de cambios y legibilidad del formato se conservan en Markdown, separados del historial de intervenciones del equipo. Los pies del modelo no certifican aprobación actual.

## Usuarios y página única — 2026-09-11

Usuarios permite agregar y editar nombre, correo, perfil y habilitación. Perfiles: Administrador TI (todo), Editor de inventario (edición y reportes, sin credenciales/usuarios), Solo reportes (consulta). El administrador principal permanece activo. Correos duplicados se rechazan. Esto configura la propuesta de acceso: no hay login, invitaciones ni permisos efectivos aún.

Imprimir en una página / PDF compacta campos y ajusta proporcionalmente el documento completo a A4, márgenes 10 mm. Conserva el historial; un documento extenso produce texto pequeño y muestra aviso. Revisar vista de impresión y desactivar encabezados/pies del navegador. No se ha verificado la paginación final con una impresión de navegador.

Los originales `ACTA DE ENTREGA-RESPONSABLE.pdf` y `01MI-F-03 V3 HOJA DE VIDA DEL ACTIVO.pdf` están en `depurado/superados/`; los Markdown en la raíz conservan enlaces actualizados.


Ajustes solicitados el 2026-09-11: acta sin adquisición, estado, procesador, sistema operativo, almacenamiento ni tarjeta de video; estos datos permanecen en hoja de vida. Registro de accesorios del acta con tipo libre/sugerido, cantidad y detalle (marca/serial), guardados en la copia del acta. Programas (licencias) instalados se precarga desde asignaciones y se puede revisar; eliminada línea final duplicada de licencias. Retirados indicadores C/I/B/R/IN y sus casillas de la hoja de vida de la maqueta; transcripción del modelo original intacta. Compilación y lint correctos.

## Accesorios en ambos documentos

En ficha del equipo → Hoja de vida, registrar tipo de evento Accesorio, fecha, funcionario y descripción (ej. “1 × teclado USB, marca…, serial…”); observaciones si aplican. Al guardar aparece en la hoja de vida. En Acta de entrega, marcar los accesorios registrados que se entregarán: se copian al generar el documento. Agregar accesorio manual en acta sigue disponible para elementos exclusivos de esa entrega. RAM ya no aparece en acta, pero permanece en hoja de vida.

## Bodega de accesorios

Accesorios → registrar nombre, marca/modelo y cantidad recibida. Mismo nombre/marca suma existencias. Acta → Asignar desde bodega → marcar artículos y cantidades → Generar acta y confirmar entrega. Se descuenta de bodega y se registra responsable/equipo en historial. Reimprimir acta no genera otra entrega. Accesorios → Devolver a bodega devuelve toda la cantidad de esa asignación, conservando fecha. La hoja de vida incluye movimientos. No hay existencias reales precargadas. Los accesorios manuales antiguos son texto documental, no movimientos de bodega.
## Persistencia y licencias integradas

La maqueta guarda cambios en el almacenamiento local del navegador para que no se pierdan al recargar el mismo navegador. Esto no reemplaza una base de datos ni un respaldo; limpiar los datos del sitio o cambiar de navegador los elimina.

El sistema operativo integrado se registra en la ficha de Desktop o Portátil. No se crea como lote en Licencias ni consume cupos. Licencias queda para adquisiciones independientes.

Al asignar un monitor se muestra equipo, nombre y responsable en el selector. Al asignar una licencia, el mensaje identifica esos mismos datos.
## Bajas y administración de registros

El menú Bajas conserva equipos con estado Baja, por daño o fin de ciclo de vida, separados del inventario operativo. Para enviarlo allí se edita el equipo y se selecciona Estado: Baja; el registro, actas y hoja de vida se conservan. Activos TI omite esos equipos y Bajas los lista para consulta y recuperación posterior.

Responsables, Licencias, Usuarios y Accesorios muestran acciones Editar y Eliminar con confirmación. Las eliminaciones se bloquean cuando existen relaciones o movimientos que deben conservarse; el administrador debe usar Baja o devolución cuando se trate de un activo histórico.

## Plan semestral de mantenimiento

El menú Mantenimiento muestra todos los equipos operativos ordenados por próxima fecha. Vencido significa fecha anterior a hoy; Próximo cubre los siguientes 30 días; Programado está después; Sin fecha requiere adquisición o último mantenimiento. La fecha se calcula seis meses calendario después del último mantenimiento realizado, o desde adquisición si aún no existe mantenimiento. Abrir el equipo lleva a Hoja de vida; registrar el evento “Mantenimiento realizado” actualiza el plan. Los equipos en Bajas no aparecen en este plan operativo.

## Mantenimiento: fuente única

Los campos de mantenimiento ya no se muestran en Activos TI para evitar duplicidad. Registra cada intervención en la Hoja de vida del equipo, con fecha, tipo, técnico, proveedor, materiales, horas, costo y observaciones. El menú Mantenimiento usa ese historial para calcular la próxima fecha semestral y no se actualiza desde otro formulario.
