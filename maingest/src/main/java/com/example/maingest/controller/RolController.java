package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.AlmacenUsuario;
import com.example.maingest.domain.Permiso;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.RolPermiso;
import com.example.maingest.domain.RolPermisoId;
import com.example.maingest.domain.UsuarioRol;
import com.example.maingest.domain.UsuarioRolId;
import com.example.maingest.dto.PermisoDtos.PermisoDto;
import com.example.maingest.dto.RolDtos.RolCreateDto;
import com.example.maingest.dto.RolDtos.RolDto;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.PermisoRepository;
import com.example.maingest.repository.AlmacenUsuarioRepository;
import com.example.maingest.repository.RolPermisoRepository;
import com.example.maingest.repository.RolRepository;
import com.example.maingest.repository.UsuarioRolRepository;
import com.example.maingest.domain.Usuario;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.AuditoriaService;
import com.example.maingest.service.PermissionService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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
    private final UsuarioRolRepository usuarioRolRepository;
    private final AlmacenUsuarioRepository almacenUsuarioRepository;
    private final PermissionService permissionService;
    private final AuditoriaService auditoriaService;
    private final AccessControlService accessControlService;

    public RolController(
            RolRepository rolRepository,
            PermisoRepository permisoRepository,
            RolPermisoRepository rolPermisoRepository,
            EmpresaRepository empresaRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            UsuarioRolRepository usuarioRolRepository,
            AlmacenUsuarioRepository almacenUsuarioRepository,
            PermissionService permissionService,
            AuditoriaService auditoriaService,
            AccessControlService accessControlService
    ) {
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
        this.rolPermisoRepository = rolPermisoRepository;
        this.empresaRepository = empresaRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.almacenUsuarioRepository = almacenUsuarioRepository;
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
    public ResponseEntity<RolDto> obtener(@PathVariable("id") Long id) {
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
        rol.setDescripcion(dto.descripcion() != null ? dto.descripcion() : "");
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
    public ResponseEntity<RolDto> actualizar(@PathVariable("id") Long id, @RequestBody RolCreateDto actualizacion) {
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
        rol.setDescripcion(actualizacion.descripcion() != null ? actualizacion.descripcion() : "");
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
    public ResponseEntity<Void> eliminar(@PathVariable("id") Long id) {
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

        long usuariosConRol = usuarioRolRepository.countByRol(rol);
        long usuariosEmpresaConRol = empresaUsuarioRepository.countByRol(rol);
        long usuariosAlmacenConRol = almacenUsuarioRepository.countByRol(rol);
        if (usuariosConRol > 0 || usuariosEmpresaConRol > 0 || usuariosAlmacenConRol > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        List<RolPermiso> permisos = rolPermisoRepository.findByRol(rol);
        if (!permisos.isEmpty()) {
            rolPermisoRepository.deleteAll(permisos);
            rolPermisoRepository.flush();
        }
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
    public ResponseEntity<List<PermisoDto>> permisosDeRol(@PathVariable("id") Long id) {
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

    public record EliminarRolRequest(
            Long nuevoRolId,
            Boolean dejarSinRol
    ) {
    }

    @PostMapping("/{id}/eliminar")
    @Transactional
    public ResponseEntity<Void> eliminarConReasignacion(
            @PathVariable("id") Long id,
            @RequestBody EliminarRolRequest request
    ) {
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

        boolean dejarSinRol = request != null && Boolean.TRUE.equals(request.dejarSinRol());
        Long nuevoRolId = request != null ? request.nuevoRolId() : null;
        Rol nuevoRol = null;
        if (!dejarSinRol) {
            if (nuevoRolId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            if (nuevoRolId.equals(rol.getId())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            nuevoRol = rolRepository.findById(nuevoRolId).orElse(null);
            if (nuevoRol == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
        }

        List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByRol(rol);
        if (!usuarioRoles.isEmpty()) {
            if (dejarSinRol) {
                for (UsuarioRol relacion : usuarioRoles) {
                    if (relacion == null) {
                        continue;
                    }
                    usuarioRolRepository.delete(relacion);
                }
                usuarioRolRepository.flush();
            } else {
                Rol nuevoRolNoNull = Objects.requireNonNull(nuevoRol);
                List<UsuarioRol> nuevos = new ArrayList<>();
                for (UsuarioRol relacion : usuarioRoles) {
                    if (relacion == null) {
                        continue;
                    }
                    Usuario usuario = relacion.getUsuario();
                    if (usuario == null || usuario.getId() == null) {
                        continue;
                    }
                    UsuarioRol nuevoRel = new UsuarioRol();
                    nuevoRel.setUsuario(usuario);
                    nuevoRel.setRol(nuevoRolNoNull);
                    nuevoRel.setId(new UsuarioRolId(usuario.getId(), nuevoRolNoNull.getId()));
                    nuevos.add(nuevoRel);
                    usuarioRolRepository.delete(relacion);
                }
                if (!nuevos.isEmpty()) {
                    usuarioRolRepository.saveAll(nuevos);
                }
                usuarioRolRepository.flush();
            }
        }

        List<EmpresaUsuario> empresaUsuarios = empresaUsuarioRepository.findByRol(rol);
        if (!empresaUsuarios.isEmpty()) {
            if (dejarSinRol) {
                for (EmpresaUsuario relacion : empresaUsuarios) {
                    if (relacion == null) {
                        continue;
                    }
                    relacion.setRol(null);
                }
            } else {
                Rol nuevoRolNoNull = Objects.requireNonNull(nuevoRol);
                for (EmpresaUsuario relacion : empresaUsuarios) {
                    if (relacion == null) {
                        continue;
                    }
                    relacion.setRol(nuevoRolNoNull);
                }
            }
            empresaUsuarioRepository.saveAll(empresaUsuarios);
            empresaUsuarioRepository.flush();
        }

        List<AlmacenUsuario> almacenUsuarios = almacenUsuarioRepository.findByRol(rol);
        if (!almacenUsuarios.isEmpty()) {
            if (dejarSinRol) {
                for (AlmacenUsuario relacion : almacenUsuarios) {
                    if (relacion == null) {
                        continue;
                    }
                    relacion.setRol(null);
                }
            } else {
                Rol nuevoRolNoNull = Objects.requireNonNull(nuevoRol);
                for (AlmacenUsuario relacion : almacenUsuarios) {
                    if (relacion == null) {
                        continue;
                    }
                    relacion.setRol(nuevoRolNoNull);
                }
            }
            almacenUsuarioRepository.saveAll(almacenUsuarios);
            almacenUsuarioRepository.flush();
        }

        List<RolPermiso> permisos = rolPermisoRepository.findByRol(rol);
        if (!permisos.isEmpty()) {
            rolPermisoRepository.deleteAll(permisos);
            rolPermisoRepository.flush();
        }
        rolRepository.deleteById(rol.getId());
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

    @PostMapping("/{id}/permisos")
    public ResponseEntity<Void> asignarPermiso(@PathVariable("id") Long id, @RequestBody AsignarPermisoRequest request) {
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
    public ResponseEntity<Void> quitarPermiso(@PathVariable("id") Long id, @PathVariable("permisoId") Long permisoId) {
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
