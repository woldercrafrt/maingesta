package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.EmpresaUsuarioId;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.Usuario;
import com.example.maingest.domain.UsuarioRol;
import com.example.maingest.domain.UsuarioRolId;
import com.example.maingest.dto.EmpresaUsuarioDto;
import com.example.maingest.dto.UsuarioDtos.UsuarioCreateDto;
import com.example.maingest.dto.UsuarioDtos.UsuarioDto;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.RolRepository;
import com.example.maingest.repository.UsuarioRepository;
import com.example.maingest.repository.UsuarioRolRepository;
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
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final EmpresaRepository empresaRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;
    private final AuditoriaService auditoriaService;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            UsuarioRolRepository usuarioRolRepository,
            EmpresaRepository empresaRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            AccessControlService accessControlService,
            PermissionService permissionService,
            AuditoriaService auditoriaService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.empresaRepository = empresaRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.accessControlService = accessControlService;
        this.permissionService = permissionService;
        this.auditoriaService = auditoriaService;
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
    public List<UsuarioDto> listar() {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return List.of();
        }
        if (!permissionService.hasPermission(actor, "USUARIO", 1)) {
            return List.of();
        }
        if (accessControlService.isSuperAdmin(actor)) {
            return usuarioRepository.findAll().stream()
                    .map(this::toUsuarioDto)
                    .collect(Collectors.toList());
        }
        List<EmpresaUsuario> relacionesActor = empresaUsuarioRepository.findByUsuario(actor);
        if (relacionesActor.isEmpty()) {
            return List.of();
        }
        List<Empresa> empresasActor = relacionesActor.stream()
                .map(EmpresaUsuario::getEmpresa)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (empresasActor.isEmpty()) {
            return List.of();
        }
        return empresasActor.stream()
                .flatMap(empresa -> empresaUsuarioRepository.findByEmpresa(empresa).stream())
                .map(EmpresaUsuario::getUsuario)
                .filter(Objects::nonNull)
                .distinct()
                .map(this::toUsuarioDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioDto> obtener(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "USUARIO", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return usuarioRepository.findById(id)
                .map(usuario -> ResponseEntity.ok(toUsuarioDto(usuario)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UsuarioDto> crear(@RequestBody UsuarioCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "USUARIO", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Usuario usuario = new Usuario();
        usuario.setCorreo(dto.correo());
        usuario.setClave(dto.clave());
        usuario.setNombre(dto.nombre());
        usuario.setEstado(dto.estado());
        Usuario guardado = usuarioRepository.save(usuario);
        auditoriaService.registrar(
                actor,
                "USUARIO_CREAR",
                "USUARIO",
                guardado.getId(),
                "Creó el usuario \"" + guardado.getCorreo() + "\"",
                null
        );
        return ResponseEntity.created(URI.create("/api/usuarios/" + guardado.getId())).body(toUsuarioDto(guardado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioDto> actualizar(@PathVariable Long id, @RequestBody UsuarioCreateDto actualizacion) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "USUARIO", 3)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Usuario> existente = usuarioRepository.findById(id);
        if (existente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = existente.get();
        if (actualizacion.correo() != null && !actualizacion.correo().isBlank()) {
            usuario.setCorreo(actualizacion.correo());
        }
        if (actualizacion.clave() != null && !actualizacion.clave().isBlank()) {
            usuario.setClave(actualizacion.clave());
        }
        if (actualizacion.nombre() != null && !actualizacion.nombre().isBlank()) {
            usuario.setNombre(actualizacion.nombre());
        }
        if (actualizacion.estado() != null && !actualizacion.estado().isBlank()) {
            usuario.setEstado(actualizacion.estado());
        }
        Usuario guardado = usuarioRepository.save(usuario);
        auditoriaService.registrar(
                actor,
                "USUARIO_EDITAR",
                "USUARIO",
                guardado.getId(),
                "Actualizó el usuario \"" + guardado.getCorreo() + "\"",
                null
        );
        return ResponseEntity.ok(toUsuarioDto(guardado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "USUARIO", 4)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();
        usuarioRepository.deleteById(id);
        auditoriaService.registrar(
                actor,
                "USUARIO_ELIMINAR",
                "USUARIO",
                usuario.getId(),
                "Eliminó el usuario \"" + usuario.getCorreo() + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/roles")
    public ResponseEntity<List<EmpresaUsuarioDto>> rolesDeUsuario(@PathVariable Long id) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();
        List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByUsuario(usuario);
        List<EmpresaUsuarioDto> roles = usuarioRoles.stream()
                .map(ur -> new EmpresaUsuarioDto(null, ur.getUsuario().getId(), ur.getRol().getNombre()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }

    public record AsignarRolRequest(Long rolId) {
    }

    @PostMapping("/{id}/roles")
    @Transactional
    public ResponseEntity<Void> asignarRol(
            @PathVariable Long id,
            @RequestBody AsignarRolRequest request
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "USUARIO", 5)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();

        if (request.rolId() == null) {
            List<UsuarioRol> rolesActuales = usuarioRolRepository.findByUsuario(usuario);
            for (UsuarioRol ur : rolesActuales) {
                if (!accessControlService.canRemoveGlobalRole(actor, usuario, ur.getRol())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
            usuarioRolRepository.deleteAll(rolesActuales);
            auditoriaService.registrar(
                    actor,
                    "USUARIO_QUITAR_ROLES_GLOBALES",
                    "USUARIO",
                    usuario.getId(),
                    "Quitó todos los roles globales del usuario \"" + usuario.getCorreo() + "\"",
                    null
            );
            return ResponseEntity.ok().build();
        }

        Optional<Rol> rolOpt = rolRepository.findById(request.rolId());
        if (rolOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Rol rol = rolOpt.get();
        if (!accessControlService.canAssignGlobalRole(actor, rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        UsuarioRolId usuarioRolId = new UsuarioRolId(usuario.getId(), rol.getId());
        if (usuarioRolRepository.existsById(usuarioRolId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        UsuarioRol usuarioRol = new UsuarioRol();
        usuarioRol.setId(usuarioRolId);
        usuarioRol.setUsuario(usuario);
        usuarioRol.setRol(rol);
        usuarioRolRepository.save(usuarioRol);
        auditoriaService.registrar(
                actor,
                "USUARIO_ASIGNAR_ROL_GLOBAL",
                "USUARIO",
                usuario.getId(),
                "Asignó el rol global \"" + rol.getNombre() + "\" al usuario \"" + usuario.getCorreo() + "\"",
                null
        );
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{id}/roles/{rolId}")
    public ResponseEntity<Void> quitarRol(
            @PathVariable Long id,
            @PathVariable Long rolId
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Optional<Rol> rolOpt = rolRepository.findById(rolId);
        if (rolOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Usuario objetivo = usuarioOpt.get();
        Rol rol = rolOpt.get();
        if (!accessControlService.canRemoveGlobalRole(actor, objetivo, rol)
                && !permissionService.hasPermission(actor, "USUARIO", 5)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        UsuarioRolId usuarioRolId = new UsuarioRolId(id, rolId);
        Optional<UsuarioRol> usuarioRolOpt = usuarioRolRepository.findById(usuarioRolId);
        if (usuarioRolOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        UsuarioRol usuarioRol = usuarioRolOpt.get();
        usuarioRolRepository.deleteById(usuarioRolId);
        auditoriaService.registrar(
                actor,
                "USUARIO_QUITAR_ROL_GLOBAL",
                "USUARIO",
                objetivo.getId(),
                "Quitó el rol global \"" + usuarioRol.getRol().getNombre() + "\" del usuario \"" + objetivo.getCorreo() + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }

    public record AsignarEmpresaRequest(Long empresaId, Long rolId) {
    }

    @GetMapping("/{id}/empresas")
    public ResponseEntity<List<EmpresaUsuarioDto>> empresasDeUsuario(@PathVariable Long id) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();
        List<EmpresaUsuario> empresas = empresaUsuarioRepository.findByUsuario(usuario);
        if (empresas.size() > 1) {
            empresas = List.of(empresas.get(0));
        }
        List<EmpresaUsuarioDto> respuesta = empresas.stream()
                .map(eu -> new EmpresaUsuarioDto(
                        eu.getEmpresa().getId(),
                        eu.getUsuario().getId(),
                        eu.getRol() != null ? eu.getRol().getNombre() : null
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(respuesta);
    }

    private UsuarioDto toUsuarioDto(Usuario usuario) {
        List<String> roles = usuarioRolRepository.findByUsuario(usuario).stream()
                .map(UsuarioRol::getRol)
                .filter(Objects::nonNull)
                .map(Rol::getNombre)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findByUsuario(usuario);
        EmpresaUsuario relacionEmpresa = relaciones.isEmpty() ? null : relaciones.get(0);
        Empresa empresaAsignada = relacionEmpresa != null ? relacionEmpresa.getEmpresa() : null;
        Rol rolEmpresa = relacionEmpresa != null ? relacionEmpresa.getRol() : null;
        String empresaNombre = empresaAsignada != null ? empresaAsignada.getNombre() : null;
        String empresaRolNombre = rolEmpresa != null ? rolEmpresa.getNombre() : null;
        List<String> empresas = relaciones.isEmpty()
                ? List.of()
                : relaciones.stream()
                .map(EmpresaUsuario::getEmpresa)
                .filter(Objects::nonNull)
                .map(Empresa::getNombre)
                .filter(Objects::nonNull)
                .limit(1)
                .toList();
        return new UsuarioDto(
                usuario.getId(),
                usuario.getCorreo(),
                usuario.getNombre(),
                usuario.getEstado(),
                usuario.getFoto(),
                roles,
                empresas,
                empresaNombre,
                empresaRolNombre
        );
    }

    public record PerfilDto(
            Long id,
            String correo,
            String nombre,
            String estado
    ) {
    }

    public record PerfilUpdateDto(
            String nombre
    ) {
    }

    @GetMapping("/me")
    public ResponseEntity<PerfilDto> perfilActual() {
        Usuario actual = currentUsuario();
        if (actual == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(new PerfilDto(
                actual.getId(),
                actual.getCorreo(),
                actual.getNombre(),
                actual.getEstado()
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<PerfilDto> actualizarPerfilActual(@RequestBody PerfilUpdateDto actualizacion) {
        Usuario actual = currentUsuario();
        if (actual == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (actualizacion.nombre() != null && !actualizacion.nombre().isBlank()) {
            actual.setNombre(actualizacion.nombre());
        }
        Usuario guardado = usuarioRepository.save(actual);
        return ResponseEntity.ok(new PerfilDto(
                guardado.getId(),
                guardado.getCorreo(),
                guardado.getNombre(),
                guardado.getEstado()
        ));
    }

    @PostMapping("/{id}/empresas")
    @Transactional
    public ResponseEntity<Void> asignarEmpresa(
            @PathVariable Long id,
            @RequestBody AsignarEmpresaRequest request
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Optional<Empresa> empresaOpt = empresaRepository.findById(request.empresaId());
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Empresa empresa = empresaOpt.get();
        
        // Permitir rol nulo
        Rol rol = null;
        if (request.rolId() != null) {
            Optional<Rol> rolOpt = rolRepository.findById(request.rolId());
            if (rolOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            rol = rolOpt.get();
            if (!accessControlService.canAssignEmpresaRole(actor, empresa, rol)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        Usuario usuario = usuarioOpt.get();
        List<EmpresaUsuario> relacionesExistentes = empresaUsuarioRepository.findByUsuario(usuario);
        if (!relacionesExistentes.isEmpty()) {
            EmpresaUsuario relacionMismaEmpresa = relacionesExistentes.stream()
                    .filter(rel -> rel.getEmpresa() != null
                            && rel.getEmpresa().getId() != null
                            && rel.getEmpresa().getId().equals(empresa.getId()))
                    .findFirst()
                    .orElse(null);
            if (relacionMismaEmpresa != null) {
                relacionMismaEmpresa.setRol(rol);
                empresaUsuarioRepository.save(relacionMismaEmpresa);
                for (EmpresaUsuario relacion : relacionesExistentes) {
                    if (relacion == null || relacion == relacionMismaEmpresa) {
                        continue;
                    }
                    Empresa empresaExtra = relacion.getEmpresa();
                    if (empresaExtra != null && accessControlService.isLastAdminEmpresa(empresaExtra, usuario)) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).build();
                    }
                }
                for (EmpresaUsuario relacion : relacionesExistentes) {
                    if (relacion == null || relacion == relacionMismaEmpresa) {
                        continue;
                    }
                    Empresa empresaExtra = relacion.getEmpresa();
                    if (empresaExtra != null) {
                        accessControlService.removeEmpresaUsuarioAndAlmacenAccesos(empresaExtra, usuario);
                    }
                }
                empresaUsuarioRepository.flush();
                String mensajeAuditoria = rol != null 
                    ? "Actualizó el rol del usuario \"" + usuario.getCorreo() + "\" en la empresa \"" + empresa.getNombre() + "\" a \"" + rol.getNombre() + "\""
                    : "Actualizó el rol del usuario \"" + usuario.getCorreo() + "\" en la empresa \"" + empresa.getNombre() + "\" a sin rol";
                auditoriaService.registrar(
                        actor,
                        "USUARIO_ACTUALIZAR_ROL_EMPRESA",
                        "USUARIO",
                        usuario.getId(),
                        mensajeAuditoria,
                        null
                );
                return ResponseEntity.ok().build();
            }
            for (EmpresaUsuario relacion : relacionesExistentes) {
                if (relacion == null) {
                    continue;
                }
                Empresa empresaActual = relacion.getEmpresa();
                if (empresaActual != null && accessControlService.isLastAdminEmpresa(empresaActual, usuario)) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).build();
                }
            }
            for (EmpresaUsuario relacion : relacionesExistentes) {
                if (relacion == null) {
                    continue;
                }
                Empresa empresaActual = relacion.getEmpresa();
                if (empresaActual != null) {
                    accessControlService.removeEmpresaUsuarioAndAlmacenAccesos(empresaActual, usuario);
                }
            }
            empresaUsuarioRepository.flush();
        }
        EmpresaUsuarioId empresaUsuarioId = new EmpresaUsuarioId(empresa.getId(), usuario.getId());
        EmpresaUsuario empresaUsuario = new EmpresaUsuario();
        empresaUsuario.setId(empresaUsuarioId);
        empresaUsuario.setEmpresa(empresa);
        empresaUsuario.setUsuario(usuario);
        empresaUsuario.setRol(rol);
        empresaUsuarioRepository.save(empresaUsuario);
        String mensajeAuditoriaNuevo = rol != null 
            ? "Asignó al usuario \"" + usuario.getCorreo() + "\" a la empresa \"" + empresa.getNombre() + "\" con rol \"" + rol.getNombre() + "\""
            : "Asignó al usuario \"" + usuario.getCorreo() + "\" a la empresa \"" + empresa.getNombre() + "\" sin rol";
        auditoriaService.registrar(
                actor,
                "USUARIO_ASIGNAR_EMPRESA",
                "USUARIO",
                usuario.getId(),
                mensajeAuditoriaNuevo,
                null
        );
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{id}/empresas/{empresaId}")
    public ResponseEntity<Void> quitarEmpresa(
            @PathVariable Long id,
            @PathVariable Long empresaId
    ) {
        Usuario actor = currentUsuario();
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        Optional<Empresa> empresaOpt = empresaRepository.findById(empresaId);
        if (actor == null || usuarioOpt.isEmpty() || empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();
        Empresa empresa = empresaOpt.get();
        if (!accessControlService.canManageEmpresa(actor, empresa)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (accessControlService.isLastAdminEmpresa(empresa, usuario)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findAllByEmpresaAndUsuario(empresa, usuario);
        if (relaciones.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        accessControlService.removeEmpresaUsuarioAndAlmacenAccesos(empresa, usuario);
        auditoriaService.registrar(
                actor,
                "USUARIO_QUITAR_EMPRESA",
                "USUARIO",
                usuario.getId(),
                "Quitó al usuario \"" + usuario.getCorreo() + "\" de la empresa \"" + empresa.getNombre() + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/empresas/{empresaId}/rol")
    public ResponseEntity<Void> quitarRolEmpresa(
            @PathVariable Long id,
            @PathVariable Long empresaId
    ) {
        Usuario actor = currentUsuario();
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        Optional<Empresa> empresaOpt = empresaRepository.findById(empresaId);
        if (actor == null || usuarioOpt.isEmpty() || empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();
        Empresa empresa = empresaOpt.get();
        if (!accessControlService.canManageEmpresa(actor, empresa)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findAllByEmpresaAndUsuario(empresa, usuario);
        if (relaciones.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Verificar si el usuario es el último admin de la empresa
        if (accessControlService.isLastAdminEmpresa(empresa, usuario)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        
        // Quitar solo el rol, manteniendo la asociación empresa-usuario
        for (EmpresaUsuario relacion : relaciones) {
            relacion.setRol(null);
            empresaUsuarioRepository.save(relacion);
        }
        
        auditoriaService.registrar(
                actor,
                "USUARIO_QUITAR_ROL_EMPRESA",
                "USUARIO",
                usuario.getId(),
                "Quitó el rol del usuario \"" + usuario.getCorreo() + "\" en la empresa \"" + empresa.getNombre() + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }
}
