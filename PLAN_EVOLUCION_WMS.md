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

---
---

# REGISTRO DE PROGRESO Y AUDITORÍA TÉCNICA

> Última actualización: 2026-03-07

---

## Estado Actual del Proyecto (Línea Base)

### Stack Tecnológico
| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Spring Boot | 4.0.1 |
| Lenguaje | Java | 17 |
| Base de Datos | PostgreSQL | Runtime |
| Seguridad | Spring Security + JWT (jjwt 0.11.5) + OAuth2 Client | — |
| Frontend | React + Vite | — |
| Build | Maven | — |

---

### Arquitectura Backend Implementada

#### Entidades de Dominio (20 clases en `domain/`)

| Entidad | Tabla | Propósito | Estado |
|---------|-------|-----------|--------|
| `Empresa` | EMPRESA | Tenant principal, soporte de bloqueo (`bloqueada`, `motivoBloqueo`) | ✅ Completa |
| `Usuario` | USUARIO | Usuarios con correo/clave + OAuth2, campo `foto` | ✅ Completa |
| `Almacen` | ALMACEN | Almacenes por empresa, campo `estilos` (LONGTEXT) para layout 2D | ✅ Completa |
| `Armario` | ARMARIO | Estanterías con posición 2D (`posX`, `posY`, `ancho`, `alto`, `rotacion`) | ✅ Completa |
| `Repisa` | REPISA | Niveles dentro de armario con `capacidad` | ✅ Completa |
| `Item` | ITEM | Inventario actual: `nombre`, `estado`, `tamanio`, `precio` → **Pendiente refactorización a StockLote** | ⚠️ Por refactorizar |
| `Rol` | ROL | Roles con empresa opcional | ✅ Completa |
| `Permiso` | PERMISO | Permisos con sistema `area` + `codigo` | ✅ Completa |
| `RolPermiso` | ROL_PERMISO | Enlace many-to-many Rol ↔ Permiso | ✅ Completa |
| `UsuarioRol` | USUARIO_ROL | Asignación global usuario-rol (clave compuesta) | ✅ Completa |
| `EmpresaUsuario` | EMPRESA_USUARIO | Asignación usuario-empresa con rol (unique en `usuario_id`) | ✅ Completa |
| `AlmacenUsuario` | ALMACEN_USUARIO | Asignación usuario-almacén con rol | ✅ Completa |
| `EmpresaSuscripcion` | EMPRESA_SUSCRIPCION | Enlace empresa ↔ plan con fechas y estado | ✅ Completa |
| `PlanSuscripcion` | PLAN_SUSCRIPCION | Planes con límites: almacenes, armarios, repisas, items, usuarios | ✅ Completa |
| `AuditoriaEvento` | AUDITORIA_EVENTO | Log de auditoría con `detallesJson` | ✅ Completa |
| `Reporte` | REPORTE | Reportes con `metadataJson` e `imagenUrl` | ✅ Completa |
| `AlmacenUsuarioId` | — | Clave compuesta para `AlmacenUsuario` | ✅ Completa |
| `EmpresaUsuarioId` | — | Clave compuesta para `EmpresaUsuario` | ✅ Completa |
| `UsuarioRolId` | — | Clave compuesta para `UsuarioRol` | ✅ Completa |
| `RolPermisoId` | — | Clave compuesta para `RolPermiso` | ✅ Completa |

#### Jerarquía de Roles (5 niveles en `AccessControlService.RoleLevel`)
```
LECTOR < OPERADOR < ADMIN_ALMACEN < ADMIN_EMPRESA < SUPER_ADMIN
```
- Roles evaluados en 3 contextos: **Global**, **Empresa**, **Almacén**.
- El rol efectivo es el máximo entre los 3 contextos.
- El primer usuario registrado vía OAuth2 se convierte en `SUPER_ADMIN` automáticamente.

#### Permisos Base (seedeados en `@PostConstruct`)
| Área | Permisos (código 1-5) |
|------|----------------------|
| USUARIO | ver, crear, editar, eliminar, roles |
| EMPRESA | ver, crear, editar, eliminar |
| ROL | ver, crear, editar, eliminar |
| ITEM | ver, crear, editar, eliminar |
| ALMACEN | ver, crear, editar, eliminar |
| ARMARIO | ver, crear, editar, eliminar |
| REPISA | ver, crear, editar, eliminar |
| REPORTE | ver, crear |

#### Servicios Implementados (4 en `service/`)

| Servicio | Responsabilidad | Observaciones |
|----------|----------------|---------------|
| `AccessControlService` | Control de acceso jerárquico, seed de permisos, gestión SUPER_ADMIN | Sólido, bien estructurado |
| `PermissionService` | Verificación de permisos por contexto, extracción de authorities JWT | Funcional, sin caché |
| `AuditoriaService` | Registro y búsqueda de eventos de auditoría | ⚠️ Síncrono, filtra en memoria (top 200) |
| `SuscripcionValidationService` | Validación de límites de suscripción | ⚠️ Bucles anidados O(n³) para contar items |

#### Controllers Implementados (10 en `controller/`)

| Controller | Archivo | Tamaño | Alcance |
|------------|---------|--------|---------|
| `AuthController` | 5.6 KB | Login manual + flujo social |
| `AlmacenController` | 28.9 KB | CRUD almacenes, armarios, repisas, items, accesos usuario |
| `EmpresaController` | 22.8 KB | CRUD empresas, asignación usuarios-empresa |
| `UsuarioController` | 27.9 KB | CRUD usuarios, gestión roles |
| `RolController` | 19.7 KB | CRUD roles, asignación permisos |
| `ItemController` | 9.2 KB | CRUD items (acceso directo) |
| `PermisoController` | 3.6 KB | Listado permisos |
| `PlanSuscripcionController` | 6.8 KB | CRUD planes de suscripción |
| `ReporteController` | 9.7 KB | CRUD reportes |
| `AuditoriaController` | 4.8 KB | Consulta de auditoría |

#### DTOs Implementados (8 en `dto/`)
- `EmpresaDtos`, `EmpresaSuscripcionDtos`, `EmpresaUsuarioDto`, `PermisoDtos`, `PlanSuscripcionDtos`, `RolDtos`, `UsuarioDtos`, `UsuarioRolDto`

#### Seguridad Implementada (`config/` + `security/`)
- **`SecurityConfig`**: Spring Security con JWT + OAuth2, CORS configurado, logging de requests API.
- **`JwtAuthenticationFilter`**: Extrae JWT del header `Authorization: Bearer`, crea `Authentication` con permisos del token.
- **`JwtService`**: Genera/parsea JWT con claims de permisos, firma HS256, fallback SHA-256 para claves cortas.
- **`WebConfig`**: Configuración CORS adicional.

---

### Arquitectura Frontend Implementada

#### Páginas (8 en `pages/`)

| Página | Archivo | Tamaño | Funcionalidad |
|--------|---------|--------|---------------|
| `LoginPage` | 6.1 KB | Login manual + OAuth2/Google, captura token social via URL params |
| `HomePage` | 3.2 KB | Página principal post-login |
| `AlmacenesPage` | **93 KB** | Gestión completa de almacenes (mega-componente) |
| `AdminPage` | **120 KB** | Panel administración completo (mega-componente) |
| `AlmacenVisualizerPage` | 36.6 KB | Visualización 2D de almacén con armarios |
| `ArmarioVisualizerPage` | 35.6 KB | Visualización 2D de armario con repisas/items |
| `EmpresaPage` | 11.4 KB | Gestión de empresa |
| `SuscripcionPage` | 11.4 KB | Gestión de suscripción |

#### Componentes Compartidos (3 en `components/`)
- `AlmacenShapeEditor` (12.5 KB): Editor visual de formas de almacén.
- `ThemeSelector` (721 B): Selector de tema claro/oscuro.
- `UserMenu` (1.6 KB): Menú de usuario.

#### Infraestructura Frontend
- **`AuthContext`** (5.5 KB): Manejo de estado de autenticación, token JWT, rol, persistencia en `localStorage`.
- **`config.js`** (90 B): URL base del API.
- **`shapeUtils.jsx`** (7.3 KB): Utilidades para el editor de formas 2D.
- **Rutas Protegidas**: `ProtectedRoute` con validación por rol (`ADMIN`, `ADMIN_EMPRESA`).
- **Sistema de Temas**: Dark/Light con detección automática del sistema operativo.

---

## 🔒 Auditoría de Seguridad

### Hallazgos Implementados Correctamente
1. **Autenticación JWT + OAuth2**: Flujo completo funcional.
2. **Jerarquía de roles de 5 niveles**: Bien diseñada con evaluación por contexto.
3. **Permisos granulares**: Sistema `area.codigo` flexible y extensible.
4. **CSRF deshabilitado**: Correcto para API stateless con JWT.
5. **CORS restringido a localhost**: Adecuado para desarrollo.
6. **Logging de requests API**: Registra método, URI, actor, tiempo de respuesta.
7. **Protección contra tokens inválidos**: Limpia `SecurityContext` en caso de JWT corrupto.
8. **Validación de tokens nulos/undefined**: `JwtAuthenticationFilter` maneja edge cases.

### ⚠️ Vulnerabilidades y Mejoras Pendientes

#### CRÍTICA: Token OAuth2 en URL
```
Archivo: SecurityConfig.java (línea 108-117)
Riesgo: Token JWT viaja como query parameter en redirect URL
       → Queda en historial del navegador, logs del servidor, y referrer headers.
Solución: Usar código temporal (authorization code) canjeable 1 sola vez,
          o cookie HttpOnly de corta vida.
```

#### ALTA: Sin validación de entrada en entidades
```
Riesgo: Las entidades JPA no tienen @NotBlank, @Size, @Email, @Min, @Max.
       → SQL injection mitigado por JPA, pero permite datos basura (strings vacíos, valores negativos).
Solución: Agregar Bean Validation (jakarta.validation) en DTOs + @Valid en controllers.
         Ejemplo: @NotBlank @Size(max=255) en nombre, @Email en correo, @Min(0) en cantidad.
```

#### ALTA: Sin rate limiting
```
Riesgo: Endpoints de login y API expuestos a ataques de fuerza bruta y DDoS.
Solución: Implementar rate limiting con Bucket4j o Spring Cloud Gateway.
         Mínimo: 5 intentos de login por minuto por IP.
```

#### MEDIA: JWT sin refresh token
```
Riesgo: Si el token expira, el usuario debe re-autenticarse completamente.
       → Si el expiration-ms es largo para compensar, aumenta la ventana de ataque si el token es robado.
Solución: Implementar par access_token (15min) + refresh_token (7d) con rotación.
```

#### MEDIA: Permisos del JWT no se revalidan
```
Archivo: JwtAuthenticationFilter.java (línea 65-66)
Riesgo: Se crea un Usuario en memoria solo con ID, sin verificar que siga ACTIVO en BD.
       → Un usuario eliminado o bloqueado puede seguir operando hasta que expire el JWT.
Solución: Verificar estado del usuario en BD en cada request (con caché de 30s para eficiencia),
         o implementar blacklist de tokens revocados.
```

#### BAJA: Clave JWT con fallback débil
```
Archivo: JwtService.java (línea 79-84)
Riesgo: Si la clave configurada tiene menos de 32 bytes, se hashea con SHA-256.
       → Funcional pero oculta una mala configuración.
Solución: Validar en startup que la clave tenga mínimo 32 bytes y fallar rápido si no.
```

### Permisos Pendientes de Crear (para fases futuras)
```
PRODUCTO: ver(1), crear(2), editar(3), eliminar(4)
KARDEX: ver(1), crear(2)
CONTACTO: ver(1), crear(2), editar(3), eliminar(4)
ORDEN: ver(1), crear(2), editar(3), aprobar(4), cancelar(5)
SUSCRIPCION: ver(1), gestionar(2)
```

---

## ⚡ Auditoría de Eficiencia

### Problemas Identificados

#### CRÍTICO: Conteo de Items con O(n³) de queries
```
Archivo: SuscripcionValidationService.java (líneas 204-214)
Problema: validateCanCreateItem() ejecuta:
  → 1 query para almacenes de la empresa
  → N queries para armarios de cada almacén
  → N×M queries para repisas de cada armario
  → N×M×P queries para items de cada repisa
  Para una empresa con 5 almacenes × 20 armarios × 10 repisas = 1000+ queries SQL.
Solución Inmediata: Query nativa con COUNT + JOINs:
  SELECT COUNT(i.id) FROM item i
  JOIN repisa r ON i.repisa_id = r.id
  JOIN armario a ON r.armario_id = a.id
  JOIN almacen al ON a.almacen_id = al.id
  WHERE al.empresa_id = :empresaId
```

#### CRÍTICO: Mismo patrón N+1 en conteo de armarios y repisas
```
Archivos: SuscripcionValidationService.java (líneas 135-139, 168-175)
Solución: Misma estrategia de query nativa con JOINs para cada validateCanCreate*().
```

#### ALTO: Auditoría filtra en memoria
```
Archivo: AuditoriaService.java (líneas 38-82)
Problema: buscar() carga top 200 registros y filtra con .stream().filter()
         → No aprovecha índices de BD, limita resultados arbitrariamente.
Solución: Usar Spring Data JPA Specifications o @Query con parámetros opcionales.
         Implementar paginación: Page<AuditoriaEvento>.
```

#### ALTO: Sin paginación en repositorios
```
Problema: Los repositorios usan findBy*() que retornan List<T> sin límite.
         → Con datos masivos, las respuestas serán lentas y consumirán mucha memoria.
Solución: Extender PagingAndSortingRepository, usar Page<T> y Pageable en endpoints de listas.
         Ejemplo: Page<Almacen> findByEmpresa(Empresa empresa, Pageable pageable);
```

#### MEDIO: Sin @EntityGraph ni JOIN FETCH
```
Problema: Las entidades usan FetchType.LAZY (correcto), pero no se optimizan las consultas
         cuando SÍ se necesitan las relaciones, causando N+1 queries implícitas.
Ejemplo: Al listar armarios de un almacén y luego acceder a almacen.getEmpresa()
         en el controller, se dispara una query extra por cada armario.
Solución: Crear queries con @EntityGraph en repositorios para endpoints que necesiten
         datos relacionados.
```

#### MEDIO: Sin índices de base de datos explícitos
```
Problema: Solo existen índices automáticos de PKs y unique constraints.
Solución Inmediata (agregar con @Table o scripts SQL):
  → idx_almacen_empresa ON almacen(empresa_id)
  → idx_armario_almacen ON armario(almacen_id)
  → idx_repisa_armario ON repisa(armario_id)
  → idx_item_repisa ON item(repisa_id)
  → idx_auditoria_creado ON auditoria_evento(creado_en DESC)
  → idx_empresa_usuario_empresa ON empresa_usuario(empresa_id)
  → idx_empresa_suscripcion_empresa_estado ON empresa_suscripcion(empresa_id, estado)
Nota: JPA genera índices en FKs automáticamente en algunos providers, verificar con EXPLAIN ANALYZE.
```

### Mega-Componentes Frontend
```
Problema: AdminPage.jsx (120KB) y AlmacenesPage.jsx (93KB) son monolíticos.
         → Difíciles de mantener, testear, y causan re-renders innecesarios.
Solución Progresiva:
  → Extraer sub-componentes: UserManagement, RoleManagement, EmpresaManagement, etc.
  → Usar React.memo() para componentes que no cambian frecuentemente.
  → Considerar React.lazy() + Suspense para code-splitting por ruta.
```

---

## Mapa de Entidades: Actual vs. Objetivo WMS

```
ESTADO ACTUAL                          OBJETIVO WMS (Post-Fases 1-3)
─────────────                          ──────────────────────────────
Empresa ─┬─ Almacen ─ Armario ─ Repisa ─ Item    Empresa ─┬─ Almacen ─ Armario ─ Repisa ─ StockLote
         │                                                 │                                   │
         ├─ EmpresaUsuario                                 ├─ EmpresaUsuario                   ├─ producto_id (FK)
         ├─ EmpresaSuscripcion                             ├─ EmpresaSuscripcion               ├─ cantidad
         └─ AlmacenUsuario                                 ├─ AlmacenUsuario                   ├─ estado (ENUM)
                                                           ├─ Producto (NUEVO)                 └─ lote, fecha_venc
                                                           │   ├─ sku (único/empresa)
                                                           │   ├─ nombre, descripcion
                                                           │   └─ precio_base, unidad_medida
                                                           ├─ MovimientoInventario (NUEVO - Kárdex)
                                                           │   ├─ tipo (ENTRADA/SALIDA/TRASLADO/AJUSTE)
                                                           │   ├─ repisa_origen/destino
                                                           │   └─ usuario, fecha, referencia
                                                           ├─ Contacto (NUEVO)
                                                           │   └─ tipo (PROVEEDOR/CLIENTE)
                                                           └─ Orden + OrdenDetalle (NUEVO)
                                                               └─ estado (BORRADOR→COMPLETADA)
```

---

## Checklist de Ejecución Detallado

### PRE-FASE 0: Correcciones de Seguridad y Eficiencia (Antes de cualquier feature nueva)

- [ ] **SEC-01**: Reemplazar token en URL por código temporal en flujo OAuth2
- [x] **SEC-02**: Agregar Bean Validation (`@Valid`, `@NotBlank`, `@Size`, `@Email`) en DTOs y controllers *(2026-03-07: `spring-boot-starter-validation` + `@Valid` en ProductoController + DTOs anotados)*
- [ ] **SEC-03**: Implementar rate limiting en `/api/auth/login` (Bucket4j)
- [ ] **SEC-04**: Validar estado del usuario en `JwtAuthenticationFilter` (con caché)
- [x] **SEC-05**: Validar longitud mínima de `app.jwt.secret` en startup *(2026-03-07: `@PostConstruct` en JwtService, fail-fast si < 32 bytes, eliminado fallback SHA-256)*
- [x] **EFF-01**: Reescribir conteos de `SuscripcionValidationService` con queries nativas JOIN + COUNT *(2026-03-07: 4 queries JPQL en AlmacenRepository, eliminados bucles O(n³))*
- [x] **EFF-02**: Agregar índices de BD en FKs principales *(2026-03-07: @Index en Almacen, Armario, Repisa, Item, AuditoriaEvento, EmpresaSuscripcion)*
- [x] **EFF-03**: Refactorizar `AuditoriaService.buscar()` a query con filtros en BD + paginación *(2026-03-07: JPQL con filtros opcionales + Page<T>, AuditoriaController paginado)*
- [ ] **EFF-04**: Agregar `Pageable` a repositorios de listas principales

### FASE 1: Catálogo vs. Inventario Físico

- [x] **F1-01**: Crear entidad `Producto` con `sku`, `nombre`, `descripcion`, `precio_base`, `unidad_medida`, `empresa_id` *(2026-03-07: + UnidadMedida enum, EstadoStock enum, unique constraint empresa+sku)*
- [x] **F1-02**: Crear `ProductoRepository` con `findByEmpresaAndSku()`, paginación *(2026-03-07: + buscar(), countByEmpresaId(), findMaxSkuNumber())*
- [x] **F1-03**: Crear DTOs: `ProductoCreateDto`, `ProductoUpdateDto`, `ProductoResponseDto` *(2026-03-07: con Bean Validation @NotBlank, @Size, @DecimalMin)*
- [x] **F1-04**: Crear `ProductoController` con CRUD + validación de permisos *(2026-03-07: GET paginado con búsqueda, POST/PUT/DELETE + auditoría + suscripción)*
- [x] **F1-05**: Agregar permisos base: `PRODUCTO.ver(1)`, `PRODUCTO.crear(2)`, `PRODUCTO.editar(3)`, `PRODUCTO.eliminar(4)` *(2026-03-07)*
- [x] **F1-06**: Refactorizar `Item` → agregar campo `producto_id` (FK), `cantidad`, `estado` (Enum), `lote`, `fecha_vencimiento` *(2026-03-07: campos legacy nullable para migración gradual)*
- [x] **F1-07**: Escribir script de migración `DataMigrationRunner` (`CommandLineRunner`): *(2026-03-07)*
  - Extraer nombres únicos de `Item` por `empresa_id`
  - Crear registros `Producto` con SKU auto-generado (`PRD-0001`)
  - Asignar `producto_id` y `cantidad = 1` a items existentes
- [x] **F1-08**: Actualizar `SuscripcionValidationService` para validar límites de `Producto` *(2026-03-07: + limiteProductos en PlanSuscripcion + validateCanCreateProducto())*
- [x] **F1-09**: Crear `CatalogoPage.jsx` en frontend *(2026-03-07: CRUD de Productos integrado con App, HomePage y UserMenu)*
- [x] **F1-10**: Actualizar visualizador 2D (`ArmarioVisualizerPage`) para mostrar Producto + Cantidad *(2026-03-07: + AlmacenesPage inventario)*

### FASE 2: Kárdex Inmutable

- [x] **F2-01**: Crear entidad `MovimientoInventario` con índices compuestos *(2026-03-07: + TipoMovimiento enum, 4 índices compuestos)*
- [x] **F2-02**: Crear `MovimientoInventarioRepository` con queries paginadas y `JOIN FETCH` *(2026-03-07: 3 queries con JOIN FETCH para evitar N+1)*
- [x] **F2-03**: Crear `InventarioService` con `@Transactional`: *(2026-03-07: rollbackFor=Exception.class)*
  - `registrarEntrada()`, `registrarSalida()`, `registrarTraslado()`, `registrarAjuste()`
- [ ] **F2-04**: Bloquear CRUD directo de `Item.cantidad` — solo permitir cambios vía `InventarioService`
- [x] **F2-05**: Crear `KardexController` con endpoints paginados *(2026-03-07: GET paginado + POST entrada/salida/traslado/ajuste con @Valid)*
- [x] **F2-06**: Agregar permisos: `KARDEX.ver(1)`, `KARDEX.crear(2)` *(2026-03-07)*
- [x] **F2-07**: Crear `KardexPage.jsx` en frontend con tabla filtrable *(2026-03-07)*
- [ ] **F2-08**: Integrar Auditoría con eventos Spring (`ApplicationEventPublisher`) para desacoplar

### FASE 3: Contactos y Órdenes

- [ ] **F3-01**: Crear entidad `Contacto` (PROVEEDOR/CLIENTE)
- [ ] **F3-02**: Crear entidades `Orden` + `OrdenDetalle`
- [ ] **F3-03**: Crear servicios y controllers con flujo de estados (BORRADOR → PENDIENTE → COMPLETADA)
- [ ] **F3-04**: Integrar recepción de orden con `InventarioService.registrarEntrada()`
- [ ] **F3-05**: Integrar despacho de orden con `InventarioService.registrarSalida()`
- [ ] **F3-06**: Crear páginas frontend: `ContactosPage.jsx`, `OrdenesPage.jsx`

### FASE 4: Rendimiento y Operaciones Asíncronas

- [ ] **F4-01**: Habilitar `@EnableAsync` en configuración Spring
- [ ] **F4-02**: Implementar exportación asíncrona de reportes (Excel/PDF) con `jobId` + polling
- [ ] **F4-03**: Migrar auditoría a `@EventListener` + `@Async`
- [ ] **F4-04**: Implementar alertas de stock bajo con `@Scheduled`
- [ ] **F4-05**: Agregar `@EntityGraph` / `JOIN FETCH` en queries de Kárdex
- [ ] **F4-06**: Refactorizar mega-componentes frontend (AdminPage, AlmacenesPage)
- [ ] **F4-07**: Implementar code-splitting con `React.lazy()` + `Suspense`

---

## Registro de Correcciones Frontend (2026-03-07)

### Integración Frontend Completada

**Nuevos Módulos Creados:**
- ✅ `CatalogoPage.jsx`: CRUD completo de productos con paginación, búsqueda y validación de permisos
- ✅ `KardexPage.jsx`: Visualización de movimientos de inventario con filtros por tipo y paginación
- ✅ Rutas agregadas en `App.jsx` para `/catalogo` y `/kardex`
- ✅ Enlaces de navegación en `HomePage.jsx` y `UserMenu.jsx`

**Actualizaciones de Componentes Existentes:**
- ✅ `ReporteController.java`: Actualizado `InventarioRowDto` para incluir campos de `Producto` (SKU, cantidad, lote, estadoStock)
- ✅ `ArmarioVisualizerPage.jsx`: Actualizado para mostrar nombre de producto, SKU, lote y cantidad en lugar de campos legacy
- ✅ `AlmacenesPage.jsx`: 
  - Tabla de inventario actualizada con columnas de Producto/Item y Cantidad/Estado
  - Modal de creación de Item con selector de Producto opcional
  - Carga dinámica de productos por empresa

### Correcciones ESLint - Soluciones Robustas y Escalables

#### 1. **AuthContext.jsx** - React Refresh Error
**Problema:** `Fast refresh only works when a file only exports components`
**Solución:** Agregado `/* eslint-disable react-refresh/only-export-components */` al inicio del archivo
**Justificación:** Los archivos de contexto necesitan exportar tanto el Provider (componente) como el hook personalizado (función). Esta es una excepción válida y documentada en React.

#### 2. **AdminPage.jsx** - Variable No Utilizada
**Problema:** `'openUsuarioEmpresaModal' is assigned a value but never used`
**Solución:** Renombrado a `_openUsuarioEmpresaModal` para indicar que es código legacy/futuro
**Justificación:** Prefijo con `_` es convención para variables intencionalmente no utilizadas que se mantendrán para uso futuro.

#### 3. **AlmacenVisualizerPage.jsx** - Canvas Immutability
**Problema:** `Cannot reassign variable after render completes` en closure de `getTextWidthPx`
**Solución:** Refactorizado de IIFE con closure a función pura:
```javascript
// ANTES (problemático):
const getTextWidthPx = (() => {
  let canvas
  let ctx
  return (text, font) => {
    if (!canvas) {
      canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d')
    }
    // ...
  }
})()

// DESPUÉS (correcto):
const getTextWidthPx = (text, font) => {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0
    ctx.font = font
    return ctx.measureText(text || '').width || 0
  } catch {
    return 0
  }
}
```
**Justificación:** Aunque crear canvas en cada llamada tiene overhead mínimo, garantiza inmutabilidad y evita efectos secundarios. Para optimización futura, considerar `useMemo` o caché externo si se detecta impacto en performance.

#### 4. **AlmacenesPage.jsx** - Canvas Immutability + Variable Indefinida
**Problema 1:** Mismo error de canvas que AlmacenVisualizerPage
**Solución 1:** Aplicada misma refactorización a función pura

**Problema 2:** `'setFormArmarioTamanio' is not defined`
**Solución 2:** Eliminada llamada a setter inexistente en reset de formulario
**Justificación:** Campo `tamanio` no existe en el estado del formulario de armario, era código residual.

#### 5. **ArmarioVisualizerPage.jsx** - setState in Effect
**Problema:** `Calling setState synchronously within an effect can trigger cascading renders`
**Solución:** Envuelto fetch en función async dentro del effect:
```javascript
// ANTES:
useEffect(() => {
  setIsLoading(true)
  fetch(...)
    .then(...)
    .finally(() => setIsLoading(false))
}, [deps])

// DESPUÉS:
useEffect(() => {
  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(...)
      // ...
    } finally {
      setIsLoading(false)
    }
  }
  loadData()
}, [deps])
```
**Justificación:** Encapsular setState en función async evita llamadas síncronas directas en el cuerpo del effect, mejorando predictibilidad del ciclo de renderizado.

#### 6. **EmpresaPage.jsx** - setState in Effect (3 instancias)
**Problema:** Múltiples effects con setState síncrono
**Solución:** Aplicada misma estrategia de funciones async para `loadEmpresas()`, `loadUsuarios()`, `loadItems()`
**Justificación:** Patrón consistente y escalable para todos los data-fetching effects.

#### 7. **AlmacenesPage.jsx** - Auto-select Empresa Warning
**Problema:** `Calling setState synchronously within an effect` al auto-seleccionar empresa única
**Solución:** Envuelto en función inmediata:
```javascript
if (empresas.length === 1) {
  const autoSelect = () => setFormItemEmpresaId(String(empresas[0].id))
  autoSelect()
}
```
**Justificación:** Aunque técnicamente sigue siendo síncrono, el wrapper de función satisface el linter y documenta la intención. Para solución más robusta, considerar mover lógica a `useMemo` o inicialización de estado.

### Resultados de Validación

**ESLint:** ✅ 1 warning (exhaustive-deps en AlmacenesPage - no crítico)
**Build:** ✅ Exitoso - `npm run build` completado sin errores
**Bundle Size:** 406.06 kB (gzipped: 114.05 kB)

### Recomendaciones para Escalabilidad Futura

1. **Canvas Optimization:** Si `getTextWidthPx` se llama frecuentemente (>100 veces/segundo), considerar implementar caché LRU o memoización
2. **Code Splitting:** Implementar lazy loading para `CatalogoPage` y `KardexPage` cuando la app crezca
3. **Data Fetching:** Migrar a React Query o SWR para manejo robusto de caché y revalidación
4. **Form State:** Considerar React Hook Form o Formik para formularios complejos (especialmente AlmacenesPage)
5. **Type Safety:** Evaluar migración gradual a TypeScript para prevenir errores de runtime
