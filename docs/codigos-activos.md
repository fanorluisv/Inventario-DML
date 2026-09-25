# Propuesta de códigos de activos

Aprobada por Fanor el 2026-09-11 y aplicada a los registros ficticios y nuevos registros de la maqueta. No se han migrado datos reales.

Formato: DML-TIPO-0001, consecutivo independiente por tipo y generado automáticamente en la futura versión operativa.

| Tipo | Ejemplo |
|---|---|
| Laptop / portátil | DML-LAP-0001 |
| Desktop / escritorio | DML-DES-0001 |
| Monitor | DML-MON-0001 |
| Router | DML-RTR-0001 |
| Switch | DML-SWT-0001 |
| Cámara | DML-CAM-0001 |
| DVR | DML-DVR-0001 |
| NVR | DML-NVR-0001 |
| Impresora | DML-IMP-0001 |
| Punto de acceso Wi-Fi | DML-AP-0001 |
| UPS | DML-UPS-0001 |

Código único y estable, separado del serial del fabricante. No incluir responsable, ubicación, estado ni año de adquisición; esos datos se conservan en campos propios. No reutilizar códigos de activos retirados. Usar una etiqueta física legible, opcionalmente con QR. Conservar códigos históricos en un campo de referencia si ya existen etiquetas. Las correcciones de tipo requerirán conservar trazabilidad, sin renumeración automática. El identificador interno de base debe ser independiente del código visible.

La maqueta permite elegir los tipos de este catálogo y genera el código por prefijo; monitores se registran en su pestaña. El formulario general sigue orientado a computadoras: los campos específicos para redes, cámaras y otros activos quedan pendientes. El tipo queda fijo al editar para conservar la identidad; una futura reclasificación debe ser explícita y trazable.
