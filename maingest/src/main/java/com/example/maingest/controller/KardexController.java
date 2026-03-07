package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.MovimientoInventario;
import com.example.maingest.domain.Producto;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.TipoMovimiento;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.MovimientoInventarioRepository;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.AuditoriaService;
import com.example.maingest.service.InventarioService;
import com.example.maingest.service.PermissionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kardex")
public class KardexController {

    private final InventarioService inventarioService;
    private final MovimientoInventarioRepository movimientoRepository;
    private final EmpresaRepository empresaRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;
    private final AuditoriaService auditoriaService;

    public KardexController(
            InventarioService inventarioService,
            MovimientoInventarioRepository movimientoRepository,
            EmpresaRepository empresaRepository,
            AccessControlService accessControlService,
            PermissionService permissionService,
            AuditoriaService auditoriaService
    ) {
        this.inventarioService = inventarioService;
        this.movimientoRepository = movimientoRepository;
        this.empresaRepository = empresaRepository;
        this.accessControlService = accessControlService;
        this.permissionService = permissionService;
        this.auditoriaService = auditoriaService;
    }

    // --- DTOs ---

    public record MovimientoDto(
            Long id,
            Long empresaId,
            Long productoId,
            String productoSku,
            String productoNombre,
            Long repisaOrigenId,
            Long repisaDestinoId,
            Integer cantidadMovida,
            String tipo,
            String referenciaDocumentoId,
            String observacion,
            Long usuarioId,
            String usuarioNombre,
            Instant fecha
    ) {
    }

    public record KardexPaginadoDto(
            List<MovimientoDto> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    public record EntradaDto(
            @NotNull(message = "productoId es requerido") Long productoId,
            @NotNull(message = "repisaDestinoId es requerido") Long repisaDestinoId,
            @NotNull(message = "cantidad es requerida") @Min(value = 1, message = "cantidad mínima es 1") Integer cantidad,
            String lote,
            String observacion
    ) {
    }

    public record SalidaDto(
            @NotNull(message = "productoId es requerido") Long productoId,
            @NotNull(message = "repisaOrigenId es requerido") Long repisaOrigenId,
            @NotNull(message = "cantidad es requerida") @Min(value = 1, message = "cantidad mínima es 1") Integer cantidad,
            String observacion
    ) {
    }

    public record TrasladoDto(
            @NotNull(message = "productoId es requerido") Long productoId,
            @NotNull(message = "repisaOrigenId es requerido") Long repisaOrigenId,
            @NotNull(message = "repisaDestinoId es requerido") Long repisaDestinoId,
            @NotNull(message = "cantidad es requerida") @Min(value = 1, message = "cantidad mínima es 1") Integer cantidad,
            String observacion
    ) {
    }

    public record AjusteDto(
            @NotNull(message = "productoId es requerido") Long productoId,
            @NotNull(message = "repisaId es requerido") Long repisaId,
            @NotNull(message = "nuevaCantidad es requerida") @Min(value = 0, message = "nuevaCantidad mínima es 0") Integer nuevaCantidad,
            String observacion
    ) {
    }

    // --- Consultas ---

    @GetMapping
    public ResponseEntity<KardexPaginadoDto> listar(
            @RequestParam("empresaId") Long empresaId,
            @RequestParam(name = "productoId", required = false) Long productoId,
            @RequestParam(name = "tipo", required = false) String tipo,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) {
            return ResponseEntity.notFound().build();
        }

        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "KARDEX", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);

        Page<MovimientoInventario> movimientos;
        if (productoId != null) {
            movimientos = movimientoRepository.findByEmpresaIdAndProductoIdConRelaciones(empresaId, productoId, pageable);
        } else if (tipo != null && !tipo.isBlank()) {
            try {
                TipoMovimiento tipoEnum = TipoMovimiento.valueOf(tipo.trim().toUpperCase());
                movimientos = movimientoRepository.findByEmpresaIdAndTipoConRelaciones(empresaId, tipoEnum, pageable);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        } else {
            movimientos = movimientoRepository.findByEmpresaIdConRelaciones(empresaId, pageable);
        }

        List<MovimientoDto> content = movimientos.getContent().stream()
                .map(this::toDto)
                .toList();
        KardexPaginadoDto respuesta = new KardexPaginadoDto(
                content, movimientos.getNumber(), movimientos.getSize(),
                movimientos.getTotalElements(), movimientos.getTotalPages()
        );
        return ResponseEntity.ok(respuesta);
    }

    // --- Operaciones de inventario ---

    @PostMapping("/entrada")
    public ResponseEntity<?> registrarEntrada(@Valid @RequestBody EntradaDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            MovimientoInventario mov = inventarioService.registrarEntrada(
                    dto.productoId(), dto.repisaDestinoId(), dto.cantidad(),
                    dto.lote(), dto.observacion(), actor
            );

            Empresa empresa = mov.getEmpresa();
            if (!accessControlService.isSuperAdmin(actor)
                    && !permissionService.hasPermissionForEmpresa(actor, empresa, "KARDEX", 2)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            auditoriaService.registrar(actor, "ENTRADA_INVENTARIO", "MOVIMIENTO", mov.getId(),
                    "Entrada: " + dto.cantidad() + " uds de producto " + dto.productoId(), null);

            return ResponseEntity.status(HttpStatus.CREATED).body(toDto(mov));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/salida")
    public ResponseEntity<?> registrarSalida(@Valid @RequestBody SalidaDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            MovimientoInventario mov = inventarioService.registrarSalida(
                    dto.productoId(), dto.repisaOrigenId(), dto.cantidad(),
                    dto.observacion(), actor
            );

            Empresa empresa = mov.getEmpresa();
            if (!accessControlService.isSuperAdmin(actor)
                    && !permissionService.hasPermissionForEmpresa(actor, empresa, "KARDEX", 2)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            auditoriaService.registrar(actor, "SALIDA_INVENTARIO", "MOVIMIENTO", mov.getId(),
                    "Salida: " + dto.cantidad() + " uds de producto " + dto.productoId(), null);

            return ResponseEntity.status(HttpStatus.CREATED).body(toDto(mov));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/traslado")
    public ResponseEntity<?> registrarTraslado(@Valid @RequestBody TrasladoDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            MovimientoInventario mov = inventarioService.registrarTraslado(
                    dto.productoId(), dto.repisaOrigenId(), dto.repisaDestinoId(),
                    dto.cantidad(), dto.observacion(), actor
            );

            Empresa empresa = mov.getEmpresa();
            if (!accessControlService.isSuperAdmin(actor)
                    && !permissionService.hasPermissionForEmpresa(actor, empresa, "KARDEX", 2)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            auditoriaService.registrar(actor, "TRASLADO_INVENTARIO", "MOVIMIENTO", mov.getId(),
                    "Traslado: " + dto.cantidad() + " uds de producto " + dto.productoId(), null);

            return ResponseEntity.status(HttpStatus.CREATED).body(toDto(mov));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ajuste")
    public ResponseEntity<?> registrarAjuste(@Valid @RequestBody AjusteDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            MovimientoInventario mov = inventarioService.registrarAjuste(
                    dto.productoId(), dto.repisaId(), dto.nuevaCantidad(),
                    dto.observacion(), actor
            );

            Empresa empresa = mov.getEmpresa();
            if (!accessControlService.isSuperAdmin(actor)
                    && !permissionService.hasPermissionForEmpresa(actor, empresa, "KARDEX", 2)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            auditoriaService.registrar(actor, "AJUSTE_INVENTARIO", "MOVIMIENTO", mov.getId(),
                    "Ajuste: producto " + dto.productoId() + " a cantidad " + dto.nuevaCantidad(), null);

            return ResponseEntity.status(HttpStatus.CREATED).body(toDto(mov));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // --- Mapping ---

    private MovimientoDto toDto(MovimientoInventario mov) {
        Producto producto = mov.getProducto();
        Usuario usuario = mov.getUsuario();
        Repisa origen = mov.getRepisaOrigen();
        Repisa destino = mov.getRepisaDestino();
        return new MovimientoDto(
                mov.getId(),
                mov.getEmpresa() != null ? mov.getEmpresa().getId() : null,
                producto != null ? producto.getId() : null,
                producto != null ? producto.getSku() : null,
                producto != null ? producto.getNombre() : null,
                origen != null ? origen.getId() : null,
                destino != null ? destino.getId() : null,
                mov.getCantidadMovida(),
                mov.getTipo() != null ? mov.getTipo().name() : null,
                mov.getReferenciaDocumentoId(),
                mov.getObservacion(),
                usuario != null ? usuario.getId() : null,
                usuario != null ? usuario.getNombre() : null,
                mov.getFecha()
        );
    }

    private Usuario currentUsuario() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Usuario usuario) {
            return usuario;
        }
        return null;
    }
}
