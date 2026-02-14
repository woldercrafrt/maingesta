package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.Permiso;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.RolPermiso;
import com.example.maingest.domain.RolPermisoId;
import com.example.maingest.dto.PermisoDtos.PermisoDto;
import com.example.maingest.dto.RolDtos.RolCreateDto;
import com.example.maingest.dto.RolDtos.RolDto;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.PermisoRepository;
import com.example.maingest.repository.RolPermisoRepository;
import com.example.maingest.repository.RolRepository;
import com.example.maingest.domain.Usuario;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.AuditoriaService;
import com.example.maingest.service.PermissionService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roles")
public class RolController {

    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final EmpresaRepository empresaRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final PermissionService permissionService;
    private final AuditoriaService auditoriaService;
    private final AccessControlService accessControlService;

    public RolController(
            RolRepository rolRepository,
            PermisoRepository permisoRepository,
            RolPermisoRepository rolPermisoRepository,
            EmpresaRepository empresaRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            PermissionService permissionService,
            AuditoriaService auditoriaService,
            AccessControlService accessControlService
    ) {
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
        this.rolPermisoRepository = rolPermisoRepository;
        this.empresaRepository = empresaRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.permissionService = permissionService;
        this.auditoriaService = auditoriaService;
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
    public List<RolDto> listar() {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return List.of();
        }
        if (!permissionService.hasPermission(actor, "ROL", 1)) {
            return List.of();
        }
        List<Rol> roles = rolRepository.findAll();
        if (accessControlService.isSuperAdmin(actor)) {
            return roles.stream()
                    .map(this::toDto)
                    .toList();
        }
        List<EmpresaUsuario> relacionesActor = empresaUsuarioRepository.findByUsuario(actor);
        if (relacionesActor.isEmpty()) {
            return roles.stream()
                    .filter(rol -> rol.getEmpresa() == null)
                    .map(this::toDto)
                    .toList();
        }
        List<Long> empresasActorIds = relacionesActor.stream()
                .map(EmpresaUsuario::getEmpresa)
                .filter(empresa -> empresa != null && empresa.getId() != null)
                .map(empresa -> empresa.getId())
                .distinct()
                .toList();
        return roles.stream()
                .filter(rol -> {
                    Empresa empresa = rol.getEmpresa();
                    if (empresa == null || empresa.getId() == null) {
                        return true;
                    }
                    return empresasActorIds.contains(empresa.getId());
                })
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RolDto> obtener(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "ROL", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return rolRepository.findById(id)
                .map(rol -> ResponseEntity.ok(toDto(rol)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<RolDto> crear(@RequestBody RolCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "ROL", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Rol rol = new Rol();
        rol.setNombre(dto.nombre());
        rol.setDescripcion(dto.descripcion());
        if (dto.empresaId() != null) {
            Empresa empresa = empresaRepository.findById(dto.empresaId()).orElse(null);
            rol.setEmpresa(empresa);
        } else {
            rol.setEmpresa(null);
        }
        Rol guardado = rolRepository.save(rol);
        auditoriaService.registrar(
                actor,
                "ROL_CREAR",
                "ROL",
                guardado.getId(),
                "Creó el rol \"" + guardado.getNombre() + "\"",
                null
        );
        return ResponseEntity.created(URI.create("/api/roles/" + guardado.getId())).body(toDto(guardado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RolDto> actualizar(@PathVariable Long id, @RequestBody RolCreateDto actualizacion) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "ROL", 3)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Rol> existente = rolRepository.findById(id);
        if (existente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Rol rol = existente.get();
        rol.setNombre(actualizacion.nombre());
        rol.setDescripcion(actualizacion.descripcion());
        if (actualizacion.empresaId() != null) {
            Empresa empresa = empresaRepository.findById(actualizacion.empresaId()).orElse(null);
            rol.setEmpresa(empresa);
        } else {
            rol.setEmpresa(null);
        }
        Rol guardado = rolRepository.save(rol);
        auditoriaService.registrar(
                actor,
                "ROL_EDITAR",
                "ROL",
                guardado.getId(),
                "Actualizó el rol \"" + guardado.getNombre() + "\"",
                null
        );
        return ResponseEntity.ok(toDto(guardado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "ROL", 4)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Rol> rolOpt = rolRepository.findById(id);
        if (rolOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Rol rol = rolOpt.get();
        rolRepository.deleteById(id);
        auditoriaService.registrar(
                actor,
                "ROL_ELIMINAR",
                "ROL",
                rol.getId(),
                "Eliminó el rol \"" + rol.getNombre() + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/permisos")
    public ResponseEntity<List<PermisoDto>> permisosDeRol(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "ROL", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Rol> rolOpt = rolRepository.findById(id);
        if (rolOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Rol rol = rolOpt.get();
        List<RolPermiso> rolPermisos = rolPermisoRepository.findByRol(rol);
        List<PermisoDto> permisos = rolPermisos.stream()
                .map(RolPermiso::getPermiso)
                .map(p -> new PermisoDto(p.getId(), p.getNombre(), p.getArea(), p.getCodigo()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(permisos);
    }

    public record AsignarPermisoRequest(Long permisoId) {
    }

    @PostMapping("/{id}/permisos")
    public ResponseEntity<Void> asignarPermiso(@PathVariable Long id, @RequestBody AsignarPermisoRequest request) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "ROL", 3)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Rol> rolOpt = rolRepository.findById(id);
        Optional<Permiso> permisoOpt = permisoRepository.findById(request.permisoId());
        if (rolOpt.isEmpty() || permisoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Rol rol = rolOpt.get();
        Permiso permiso = permisoOpt.get();
        RolPermisoId rolPermisoId = new RolPermisoId(rol.getId(), permiso.getId());
        if (rolPermisoRepository.existsById(rolPermisoId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        RolPermiso rolPermiso = new RolPermiso();
        rolPermiso.setId(rolPermisoId);
        rolPermiso.setRol(rol);
        rolPermiso.setPermiso(permiso);
        rolPermisoRepository.save(rolPermiso);
        auditoriaService.registrar(
                actor,
                "ROL_ASIGNAR_PERMISO",
                "ROL",
                rol.getId(),
                "Asignó el permiso \"" + permiso.getNombre() + "\" al rol \"" + rol.getNombre() + "\"",
                null
        );
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{id}/permisos/{permisoId}")
    public ResponseEntity<Void> quitarPermiso(@PathVariable Long id, @PathVariable Long permisoId) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "ROL", 3)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        RolPermisoId rolPermisoId = new RolPermisoId(id, permisoId);
        Optional<RolPermiso> rolPermisoOpt = rolPermisoRepository.findById(rolPermisoId);
        if (rolPermisoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        RolPermiso rolPermiso = rolPermisoOpt.get();
        Rol rol = rolPermiso.getRol();
        Permiso permiso = rolPermiso.getPermiso();
        rolPermisoRepository.deleteById(rolPermisoId);
        Long rolId = rol != null ? rol.getId() : id;
        auditoriaService.registrar(
                actor,
                "ROL_QUITAR_PERMISO",
                "ROL",
                rolId,
                "Quitó el permiso \"" + (permiso != null ? permiso.getNombre() : permisoId) + "\" del rol \"" + (rol != null ? rol.getNombre() : id) + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }

    private RolDto toDto(Rol rol) {
        Empresa empresa = rol.getEmpresa();
        Long empresaId = empresa != null ? empresa.getId() : null;
        String empresaNombre = empresa != null ? empresa.getNombre() : null;
        return new RolDto(rol.getId(), rol.getNombre(), rol.getDescripcion(), empresaId, empresaNombre);
    }
}
