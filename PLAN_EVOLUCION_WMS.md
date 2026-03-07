# Plan de Evolución Maingest: WMS Enterprise & Clean Code

Este documento detalla la hoja de ruta estratégica y técnica para evolucionar Maingest de un gestor visual de inventario a un Warehouse Management System (WMS) profesional.

---

## 🎯 Objetivos Estratégicos
1. **Precisión de Inventario**: Separar el concepto de "Producto" (Catálogo) de la "Existencia" (Stock físico) para permitir conteos exactos por ubicación.
2. **Trazabilidad Total**: Garantizar que el 100% de las variaciones de stock queden registradas con usuario, fecha y motivo, eliminando el "CRUD libre" de inventario.
3. **Escalabilidad Comercial**: Preparar la arquitectura para soportar integraciones B2B mediante la gestión de Órdenes de Compra/Venta y Contactos.
4. **Alta Disponibilidad y Rendimiento**: Optimizar tiempos de respuesta en consultas masivas mediante paginación, índices y procesos asíncronos.

## 📊 Indicadores Clave de Rendimiento (KPIs)
- **Precisión de Stock**: % de discrepancia entre stock lógico (Kárdex) y stock físico (Visual). Meta: < 0.1%.
- **Tiempo de Respuesta (API)**: Tiempo promedio de respuesta en endpoints críticos (ej. `GET /api/kardex`). Meta: < 200ms para 10,000 registros.
- **Trazabilidad de Auditoría**: % de modificaciones de stock sin registro de Kárdex asociado. Meta: 0%.
- **Disponibilidad del Sistema**: Evitar bloqueos de UI durante procesos pesados (ej. exportación de reportes). Meta: 100% de operaciones pesadas en background (`@Async`).

---

## 1. Fase Lógica: Catálogo vs. Inventario Físico

Actualmente, `Item` representa tanto la definición del producto como su existencia física. Esto limita la capacidad de tener "50 unidades del Producto A".

### Diseño de Entidades
- **`Producto` (Nuevo)**: Catálogo global unificado por empresa.
  - Campos: `id`, `empresa_id`, `sku` (String, único por empresa, indexado), `nombre` (String), `descripcion` (Text), `precio_base` (Decimal), `unidad_medida` (Enum: UNIDAD, KG, LITRO), `created_at`.
- **`Item` (Refactorización a `StockLote`)**: Representa una cantidad específica de un producto en una ubicación.
  - Campos actuales a eliminar: `nombre`, `precio`.
  - Nuevos campos: `producto_id` (FK), `cantidad` (Integer), `estado` (Enum: DISPONIBLE, RESERVADO, DAÑADO), `lote` (String, opcional), `fecha_vencimiento` (Date, opcional).

### Implementación Técnica (Clean Code)
- **Migración (Script Spring Boot)**:
  1. Leer todos los `Item` actuales.
  2. Extraer nombres únicos por `empresa_id` y crear registros en tabla `Producto` generando un SKU automático (ej. `PRD-0001`).
  3. Actualizar la tabla `Item` asignando el `producto_id` correspondiente y seteando `cantidad = 1`.
- **Impacto Frontend**:
  - Nuevo módulo: `CatalogoPage.jsx` para CRUD estricto de productos.
  - Componente Visual 2D: El modal de información al hacer clic en un "cuadrito" ya no mostrará un form para editar el nombre, sino: "Producto: Camiseta | Cantidad: 50 | Lote: L-123".

---

## 2. Fase de Trazabilidad: El Kárdex Inmutable

El stock físico solo debe alterarse a través de un motor de transacciones. El CRUD directo sobre la tabla `Item` queda estrictamente prohibido para usuarios.

### Diseño de Entidad
- **`MovimientoInventario` (Kárdex)**:
  - Campos: `id`, `empresa_id` (Indexado), `producto_id` (Indexado), `repisa_origen_id` (FK, nulo en entradas), `repisa_destino_id` (FK, nulo en salidas), `cantidad_movida` (Integer), `tipo` (Enum: ENTRADA, SALIDA, TRASLADO, AJUSTE), `referencia_documento_id` (String/Long), `usuario_id` (FK), `fecha` (Timestamp, indexado).

### Arquitectura de Servicios (`InventarioService.java`)
- **Centralización**: Todo método que altere `Item.cantidad` debe pasar por `InventarioService.registrarMovimiento(...)`.
- **Atomicidad (`@Transactional`)**:
  ```java
  @Transactional(rollbackFor = Exception.class)
  public void registrarEntrada(Long productoId, Long repisaId, int cantidad, Usuario actor) {
      // 1. Validar reglas de negocio (ej. límites de suscripción, bloqueos)
      // 2. Buscar Item (StockLote) existente o crearlo
      // 3. Sumar cantidad
      // 4. Crear registro en MovimientoInventario
      // 5. Guardar todo (Si falla el paso 4, el paso 3 se revierte)
  }
  ```

---

## 3. Fase Comercial: Contactos y Documentos (Órdenes)

El WMS debe responder a operaciones del mundo real. El inventario entra porque se compró y sale porque se vendió.

### Diseño de Entidades
- **`Contacto`**: Directorio B2B.
  - Campos: `id`, `empresa_id`, `tipo` (Enum: PROVEEDOR, CLIENTE), `nombre_razon_social`, `identificacion` (NIT/RUT/DNI), `email`, `telefono_contacto`.
- **`Orden`**: Documento cabecera.
  - Campos: `id`, `empresa_id`, `contacto_id` (FK), `tipo` (Enum: COMPRA, VENTA), `estado` (Enum: BORRADOR, PENDIENTE, COMPLETADA, CANCELADA), `fecha_emision`.
- **`OrdenDetalle`**: Líneas del documento.
  - Campos: `id`, `orden_id` (FK), `producto_id` (FK), `cantidad_solicitada`, `cantidad_procesada`, `precio_unitario`.

### Flujo de Trabajo
1. Usuario crea `Orden` de tipo `COMPRA` en estado `PENDIENTE`.
2. Llega el camión físicamente. El operario usa el Frontend para hacer "Recepción de Orden".
3. El sistema valida qué `Producto` llegó, pide al operario en qué `Repisa` guardarlo.
4. El backend llama a `InventarioService` -> Suma stock -> Escribe Kárdex -> Pasa `Orden` a `COMPLETADA`.

---

## 4. Fase de Rendimiento y Operaciones Asíncronas

Preparación técnica para soportar bases de datos grandes (1M+ movimientos).

### Optimizaciones de Base de Datos
1. **Índices Estratégicos**: `CREATE INDEX idx_kardex_empresa_fecha ON movimiento_inventario (empresa_id, fecha DESC);`
2. **Paginación Estricta**: Prohibir métodos como `repository.findAll()`. Usar siempre `Page<T>` de Spring Data JPA en endpoints de listas (`GET /api/kardex?page=0&size=50`).
3. **N+1 Query Problem**: En `MovimientoInventario`, usar `@EntityGraph` o `JOIN FETCH` para traer el `Producto` y el `Usuario` asociado en una sola consulta SQL, no en docena de queries separadas.

### Arquitectura Asíncrona (`@Async` / Eventos)
1. **Exportación de Reportes Excel/PDF**:
   - Implementar patrón Petición-Respuesta Asíncrona.
   - Endpoint: `POST /api/reportes/kardex` -> Devuelve HTTP 202 (Accepted) con un `jobId`.
   - Método anotado con `@Async` procesa el Excel en un hilo secundario y lo guarda en S3 o File System.
   - Frontend hace polling a `GET /api/reportes/status/{jobId}` para descargar.
2. **Auditoría Desacoplada**:
   - Reemplazar las llamadas directas a `auditoriaService.registrar()` por publicación de eventos Spring: `eventPublisher.publishEvent(new AuditoriaEvent(...))`.
   - Un `@EventListener` y `@Async` capturará el evento y guardará en BD sin sumar milisegundos a la transacción principal del usuario.
3. **Alertas de Stock Bajo**:
   - Tarea programada (`@Scheduled`) nocturna o disparada por eventos de inventario. Evaluada asíncronamente para enviar correos electrónicos a administradores sin afectar la experiencia del usuario que sacó la mercancía.

---

## Plan de Ejecución Inmediato (Próximos Pasos)
1. **[FASE 1]** Iniciar refactorización Backend: Entidad `Producto`, DTOs, Repositorios.
2. **[FASE 1]** Escribir script de migración automática de `Item` actual.
3. **[FASE 1]** Actualizar Frontend visual para usar la nueva lógica de cantidades.
4. **[FASE 2]** Implementar Kárdex Inmutable e `InventarioService`.
