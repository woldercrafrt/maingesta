package com.example.maingest.controller;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.AlmacenUsuario;
import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.Item;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.Reporte;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.AlmacenUsuarioRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.ItemRepository;
import com.example.maingest.repository.ReporteRepository;
import com.example.maingest.service.AccessControlService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ItemRepository itemRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final AlmacenUsuarioRepository almacenUsuarioRepository;
    private final ReporteRepository reporteRepository;
    private final AccessControlService accessControlService;

    public ReporteController(
            ItemRepository itemRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            AlmacenUsuarioRepository almacenUsuarioRepository,
            ReporteRepository reporteRepository,
            AccessControlService accessControlService
    ) {
        this.itemRepository = itemRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.almacenUsuarioRepository = almacenUsuarioRepository;
        this.reporteRepository = reporteRepository;
        this.accessControlService = accessControlService;
    }

    public record InventarioRowDto(
            Long empresaId,
            String empresaNombre,
            Long almacenId,
            String almacenNombre,
            Long armarioId,
            String armarioNombre,
            Long repisaId,
            Integer repisaNivel,
            Integer repisaCapacidad,
            Long itemId,
            String itemNombre,
            String itemEstado,
            Integer itemTamanio
    ) {
    }

    public record UsuarioEmpresaRowDto(
            Long empresaId,
            String empresaNombre,
            Long usuarioId,
            String usuarioNombre,
            String usuarioCorreo,
            String rolNombre
    ) {
    }

    public record ReporteDto(
            Long id,
            String tipo,
            String titulo,
            String descripcion,
            Long referenciaId,
            String imagenUrl,
            String metadataJson
    ) {
    }

    public record ReporteCreateDto(
            String tipo,
            String titulo,
            String descripcion,
            Long referenciaId,
            String imagenUrl,
            String metadataJson
    ) {
    }

    @GetMapping("/inventario")
    public ResponseEntity<List<InventarioRowDto>> reporteInventario() {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        boolean isSuperAdmin = accessControlService.isSuperAdmin(actor);
        Set<Long> empresasPermitidas = new HashSet<>();
        Set<Long> almacenesPermitidos = new HashSet<>();
        if (!isSuperAdmin) {
            List<EmpresaUsuario> empresas = empresaUsuarioRepository.findByUsuario(actor);
            for (EmpresaUsuario relacion : empresas) {
                Empresa empresa = relacion.getEmpresa();
                if (empresa != null && empresa.getId() != null) {
                    empresasPermitidas.add(empresa.getId());
                }
            }
            List<AlmacenUsuario> almacenes = almacenUsuarioRepository.findByUsuario(actor);
            for (AlmacenUsuario relacion : almacenes) {
                Almacen almacen = relacion.getAlmacen();
                if (almacen != null && almacen.getId() != null) {
                    almacenesPermitidos.add(almacen.getId());
                }
            }
        }
        List<Item> items = itemRepository.findAll();
        List<InventarioRowDto> filas = items.stream()
                .filter(item -> {
                    if (isSuperAdmin) {
                        return true;
                    }
                    Repisa repisa = item.getRepisa();
                    if (repisa == null) {
                        return false;
                    }
                    Armario armario = repisa.getArmario();
                    if (armario == null) {
                        return false;
                    }
                    Almacen almacen = armario.getAlmacen();
                    if (almacen == null || almacen.getId() == null) {
                        return false;
                    }
                    if (almacenesPermitidos.contains(almacen.getId())) {
                        return true;
                    }
                    Empresa empresa = almacen.getEmpresa();
                    return empresa != null && empresa.getId() != null && empresasPermitidas.contains(empresa.getId());
                })
                .map(item -> {
                    Repisa repisa = item.getRepisa();
                    Armario armario = repisa.getArmario();
                    Almacen almacen = armario.getAlmacen();
                    Empresa empresa = almacen.getEmpresa();
                    return new InventarioRowDto(
                            empresa.getId(),
                            empresa.getNombre(),
                            almacen.getId(),
                            almacen.getNombre(),
                            armario.getId(),
                            armario.getNombre(),
                            repisa.getId(),
                            repisa.getNivel(),
                            repisa.getCapacidad(),
                            item.getId(),
                            item.getNombre(),
                            item.getEstado(),
                            item.getTamanio()
                    );
                })
                .toList();
        return ResponseEntity.ok(filas);
    }

    @GetMapping("/usuarios")
    public ResponseEntity<List<UsuarioEmpresaRowDto>> reporteUsuariosPorEmpresa() {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findAll();
        List<UsuarioEmpresaRowDto> filas = relaciones.stream()
                .map(rel -> {
                    Empresa empresa = rel.getEmpresa();
                    Usuario usuario = rel.getUsuario();
                    String rolNombre = rel.getRol() != null ? rel.getRol().getNombre() : null;
                    return new UsuarioEmpresaRowDto(
                            empresa.getId(),
                            empresa.getNombre(),
                            usuario.getId(),
                            usuario.getNombre(),
                            usuario.getCorreo(),
                            rolNombre
                    );
                })
                .toList();
        return ResponseEntity.ok(filas);
    }

    @GetMapping
    public ResponseEntity<List<ReporteDto>> listarReportes() {
        List<ReporteDto> filas = reporteRepository.findAll().stream()
                .map(this::toReporteDto)
                .toList();
        return ResponseEntity.ok(filas);
    }

    @PostMapping
    public ResponseEntity<ReporteDto> crearReporte(@RequestBody ReporteCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Reporte reporte = new Reporte();
        reporte.setTipo(dto.tipo());
        reporte.setTitulo(dto.titulo());
        reporte.setDescripcion(dto.descripcion());
        reporte.setReferenciaId(dto.referenciaId());
        reporte.setImagenUrl(dto.imagenUrl());
        reporte.setMetadataJson(dto.metadataJson());
        reporte.setCreadoEn(java.time.Instant.now());
        Reporte guardado = reporteRepository.save(reporte);
        return ResponseEntity.status(HttpStatus.CREATED).body(toReporteDto(guardado));
    }

    private ReporteDto toReporteDto(Reporte reporte) {
        return new ReporteDto(
                reporte.getId(),
                reporte.getTipo(),
                reporte.getTitulo(),
                reporte.getDescripcion(),
                reporte.getReferenciaId(),
                reporte.getImagenUrl(),
                reporte.getMetadataJson()
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
