package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.Producto;
import com.example.maingest.domain.UnidadMedida;
import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.ProductoDtos.ProductoCreateDto;
import com.example.maingest.dto.ProductoDtos.ProductoResponseDto;
import com.example.maingest.dto.ProductoDtos.ProductoUpdateDto;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.ProductoRepository;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.AuditoriaService;
import com.example.maingest.service.PermissionService;
import com.example.maingest.service.SuscripcionValidationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoRepository productoRepository;
    private final EmpresaRepository empresaRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;
    private final AuditoriaService auditoriaService;
    private final SuscripcionValidationService suscripcionValidationService;

    public ProductoController(
            ProductoRepository productoRepository,
            EmpresaRepository empresaRepository,
            AccessControlService accessControlService,
            PermissionService permissionService,
            AuditoriaService auditoriaService,
            SuscripcionValidationService suscripcionValidationService
    ) {
        this.productoRepository = productoRepository;
        this.empresaRepository = empresaRepository;
        this.accessControlService = accessControlService;
        this.permissionService = permissionService;
        this.auditoriaService = auditoriaService;
        this.suscripcionValidationService = suscripcionValidationService;
    }

    public record ProductoPaginadoDto(
            List<ProductoResponseDto> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    @GetMapping
    public ResponseEntity<ProductoPaginadoDto> listar(
            @RequestParam("empresaId") Long empresaId,
            @RequestParam(name = "query", required = false) String query,
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
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "PRODUCTO", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.ASC, "nombre"));

        Page<Producto> productos;
        if (query != null && !query.isBlank()) {
            productos = productoRepository.buscar(empresaId, query.trim(), pageable);
        } else {
            productos = productoRepository.findByEmpresa(empresa, pageable);
        }

        List<ProductoResponseDto> content = productos.getContent().stream()
                .map(this::toResponseDto)
                .toList();
        ProductoPaginadoDto respuesta = new ProductoPaginadoDto(
                content, productos.getNumber(), productos.getSize(),
                productos.getTotalElements(), productos.getTotalPages()
        );
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoResponseDto> obtener(@PathVariable("id") Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Producto producto = productoRepository.findById(id).orElse(null);
        if (producto == null) {
            return ResponseEntity.notFound().build();
        }

        Empresa empresa = producto.getEmpresa();
        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "PRODUCTO", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(toResponseDto(producto));
    }

    @PostMapping
    public ResponseEntity<ProductoResponseDto> crear(@Valid @RequestBody ProductoCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto == null || dto.empresaId() == null || dto.nombre() == null || dto.nombre().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Empresa empresa = empresaRepository.findById(dto.empresaId()).orElse(null);
        if (empresa == null) {
            return ResponseEntity.badRequest().build();
        }

        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "PRODUCTO", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (!accessControlService.isSuperAdmin(actor)) {
            SuscripcionValidationService.ValidationResult validation = suscripcionValidationService.validateCanCreateProducto(empresa);
            if (!validation.isValid()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
        }

        String sku = dto.sku();
        if (sku == null || sku.isBlank()) {
            sku = generarSku(empresa);
        } else {
            sku = sku.trim().toUpperCase();
        }

        if (productoRepository.existsByEmpresaAndSku(empresa, sku)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        UnidadMedida unidadMedida = parseUnidadMedida(dto.unidadMedida());

        Producto producto = new Producto();
        producto.setEmpresa(empresa);
        producto.setSku(sku);
        producto.setNombre(dto.nombre().trim());
        producto.setDescripcion(dto.descripcion() != null ? dto.descripcion().trim() : null);
        producto.setPrecioBase(dto.precioBase());
        producto.setUnidadMedida(unidadMedida);

        Producto guardado = productoRepository.save(producto);

        auditoriaService.registrar(actor, "CREAR", "PRODUCTO", guardado.getId(),
                "Producto creado: " + guardado.getSku() + " - " + guardado.getNombre(), null);

        return ResponseEntity.created(URI.create("/api/productos/" + guardado.getId()))
                .body(toResponseDto(guardado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoResponseDto> actualizar(
            @PathVariable("id") Long id,
            @Valid @RequestBody ProductoUpdateDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Producto producto = productoRepository.findById(id).orElse(null);
        if (producto == null) {
            return ResponseEntity.notFound().build();
        }

        Empresa empresa = producto.getEmpresa();
        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "PRODUCTO", 3)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (dto.nombre() != null && !dto.nombre().isBlank()) {
            producto.setNombre(dto.nombre().trim());
        }
        if (dto.descripcion() != null) {
            producto.setDescripcion(dto.descripcion().trim());
        }
        if (dto.precioBase() != null) {
            producto.setPrecioBase(dto.precioBase());
        }
        if (dto.unidadMedida() != null) {
            producto.setUnidadMedida(parseUnidadMedida(dto.unidadMedida()));
        }
        if (dto.activo() != null) {
            producto.setActivo(dto.activo());
        }

        Producto guardado = productoRepository.save(producto);

        auditoriaService.registrar(actor, "EDITAR", "PRODUCTO", guardado.getId(),
                "Producto actualizado: " + guardado.getSku(), null);

        return ResponseEntity.ok(toResponseDto(guardado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable("id") Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Producto producto = productoRepository.findById(id).orElse(null);
        if (producto == null) {
            return ResponseEntity.notFound().build();
        }

        Empresa empresa = producto.getEmpresa();
        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "PRODUCTO", 4)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String info = producto.getSku() + " - " + producto.getNombre();
        productoRepository.delete(producto);

        auditoriaService.registrar(actor, "ELIMINAR", "PRODUCTO", id,
                "Producto eliminado: " + info, null);

        return ResponseEntity.noContent().build();
    }

    private String generarSku(Empresa empresa) {
        int maxNum = 0;
        try {
            maxNum = productoRepository.findMaxSkuNumber(empresa.getId());
        } catch (Exception ignored) {
        }
        return String.format("PRD-%04d", maxNum + 1);
    }

    private UnidadMedida parseUnidadMedida(String value) {
        if (value == null || value.isBlank()) {
            return UnidadMedida.UNIDAD;
        }
        try {
            return UnidadMedida.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return UnidadMedida.UNIDAD;
        }
    }

    private ProductoResponseDto toResponseDto(Producto producto) {
        Empresa empresa = producto.getEmpresa();
        return new ProductoResponseDto(
                producto.getId(),
                empresa != null ? empresa.getId() : null,
                empresa != null ? empresa.getNombre() : null,
                producto.getSku(),
                producto.getNombre(),
                producto.getDescripcion(),
                producto.getPrecioBase(),
                producto.getUnidadMedida() != null ? producto.getUnidadMedida().name() : null,
                producto.getActivo(),
                producto.getCreatedAt()
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
