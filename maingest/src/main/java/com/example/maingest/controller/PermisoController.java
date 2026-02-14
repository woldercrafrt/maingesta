package com.example.maingest.controller;

import com.example.maingest.domain.Permiso;
import com.example.maingest.dto.PermisoDtos.PermisoCreateDto;
import com.example.maingest.dto.PermisoDtos.PermisoDto;
import com.example.maingest.repository.PermisoRepository;
import com.example.maingest.domain.Usuario;
import com.example.maingest.service.AccessControlService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/permisos")
public class PermisoController {

    private final PermisoRepository permisoRepository;
    private final AccessControlService accessControlService;

    public PermisoController(PermisoRepository permisoRepository, AccessControlService accessControlService) {
        this.permisoRepository = permisoRepository;
        this.accessControlService = accessControlService;
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

    @GetMapping
    public List<PermisoDto> listar() {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return List.of();
        }
        return permisoRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PermisoDto> obtener(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return permisoRepository.findById(id)
                .map(permiso -> ResponseEntity.ok(toDto(permiso)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PermisoDto> crear(@RequestBody PermisoCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Permiso permiso = new Permiso();
        permiso.setNombre(dto.nombre());
        permiso.setArea(dto.area());
        permiso.setCodigo(dto.codigo());
        Permiso guardado = permisoRepository.save(permiso);
        return ResponseEntity.created(URI.create("/api/permisos/" + guardado.getId())).body(toDto(guardado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permisoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        permisoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private PermisoDto toDto(Permiso permiso) {
        return new PermisoDto(
                permiso.getId(),
                permiso.getNombre(),
                permiso.getArea(),
                permiso.getCodigo()
        );
    }
}
