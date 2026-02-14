package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.EmpresaUsuarioId;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.EmpresaDtos.EmpresaCreateDto;
import com.example.maingest.dto.EmpresaDtos.EmpresaDto;
import com.example.maingest.dto.EmpresaUsuarioDto;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.RolRepository;
import com.example.maingest.repository.UsuarioRepository;
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
import java.util.Optional;

@RestController
@RequestMapping("/api/empresas")
public class EmpresaController {

    private final EmpresaRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;
    private final AuditoriaService auditoriaService;

    public EmpresaController(
            EmpresaRepository empresaRepository,
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            AccessControlService accessControlService,
            PermissionService permissionService,
            AuditoriaService auditoriaService
    ) {
        this.empresaRepository = empresaRepository;
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
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
    public List<EmpresaDto> listar() {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return List.of();
        }
        if (!permissionService.hasPermission(actor, "EMPRESA", 1)) {
            return List.of();
        }
        if (accessControlService.isSuperAdmin(actor)) {
            return empresaRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findByUsuario(actor);
        if (relaciones.isEmpty()) {
            return List.of();
        }
        return relaciones.stream()
                .map(EmpresaUsuario::getEmpresa)
                .filter(empresa -> empresa != null && empresa.getId() != null)
                .distinct()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmpresaDto> obtener(@PathVariable Long id) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "EMPRESA", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();
        if (!accessControlService.isSuperAdmin(actor)) {
            List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findAllByEmpresaAndUsuario(empresa, actor);
            if (relaciones.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(toDto(empresa));
    }

    @PostMapping
    public ResponseEntity<EmpresaDto> crear(
            @RequestBody EmpresaCreateDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!accessControlService.canCreateEmpresa(actor)
                && !permissionService.hasPermission(actor, "EMPRESA", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Empresa empresa = new Empresa();
        empresa.setNombre(dto.nombre());
        Empresa guardada = empresaRepository.save(empresa);
        auditoriaService.registrar(
                actor,
                "EMPRESA_CREAR",
                "EMPRESA",
                guardada.getId(),
                "Creó la empresa \"" + guardada.getNombre() + "\"",
                null
        );
        return ResponseEntity.created(URI.create("/api/empresas/" + guardada.getId())).body(toDto(guardada));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmpresaDto> actualizar(@PathVariable Long id, @RequestBody EmpresaCreateDto actualizacion) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!permissionService.hasPermission(actor, "EMPRESA", 3)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Empresa> existente = empresaRepository.findById(id);
        if (existente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = existente.get();
        empresa.setNombre(actualizacion.nombre());
        Empresa guardada = empresaRepository.save(empresa);
        auditoriaService.registrar(
                actor,
                "EMPRESA_EDITAR",
                "EMPRESA",
                guardada.getId(),
                "Actualizó la empresa \"" + guardada.getNombre() + "\"",
                null
        );
        return ResponseEntity.ok(toDto(guardada));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable Long id
    ) {
        Usuario actor = currentUsuario();
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (actor == null || empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();
        if (!accessControlService.canDeleteEmpresa(actor)
                && !permissionService.hasPermission(actor, "EMPRESA", 4)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        empresaRepository.deleteById(id);
        auditoriaService.registrar(
                actor,
                "EMPRESA_ELIMINAR",
                "EMPRESA",
                empresa.getId(),
                "Eliminó la empresa \"" + empresa.getNombre() + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/usuarios")
    public ResponseEntity<List<EmpresaUsuarioDto>> usuariosDeEmpresa(@PathVariable Long id) {
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();
        List<EmpresaUsuario> usuarios = empresaUsuarioRepository.findByEmpresa(empresa);
        List<EmpresaUsuarioDto> respuesta = usuarios.stream()
                .map(eu -> new EmpresaUsuarioDto(
                        eu.getEmpresa().getId(),
                        eu.getUsuario().getId(),
                        eu.getRol() != null ? eu.getRol().getNombre() : null
                ))
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    public record AsignarUsuarioRequest(Long usuarioId, Long rolId) {
    }

    @PostMapping("/{id}/usuarios")
    @Transactional
    public ResponseEntity<Void> asignarUsuario(
            @PathVariable Long id,
            @RequestBody AsignarUsuarioRequest request
    ) {
        Usuario actor = currentUsuario();
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(request.usuarioId());
        Optional<Rol> rolOpt = rolRepository.findById(request.rolId());
        if (actor == null || empresaOpt.isEmpty() || usuarioOpt.isEmpty() || rolOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Empresa empresa = empresaOpt.get();
        Rol rol = rolOpt.get();
        if (!accessControlService.canAssignEmpresaRole(actor, empresa, rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
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
                auditoriaService.registrar(
                        actor,
                        "EMPRESA_ACTUALIZAR_ROL_USUARIO",
                        "EMPRESA",
                        empresa.getId(),
                        "Actualizó el rol del usuario \"" + usuario.getCorreo() + "\" en la empresa \"" + empresa.getNombre() + "\" a \"" + rol.getNombre() + "\"",
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
        auditoriaService.registrar(
                actor,
                "EMPRESA_ASIGNAR_USUARIO",
                "EMPRESA",
                empresa.getId(),
                "Asignó al usuario \"" + usuario.getCorreo() + "\" a la empresa \"" + empresa.getNombre() + "\" con rol \"" + rol.getNombre() + "\"",
                null
        );
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{id}/usuarios/{usuarioId}")
    public ResponseEntity<Void> quitarUsuario(
            @PathVariable Long id,
            @PathVariable Long usuarioId
    ) {
        Usuario actor = currentUsuario();
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(usuarioId);
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
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
                "EMPRESA_QUITAR_USUARIO",
                "EMPRESA",
                empresa.getId(),
                "Quitó al usuario \"" + usuario.getCorreo() + "\" de la empresa \"" + empresa.getNombre() + "\"",
                null
        );
        return ResponseEntity.noContent().build();
    }

    private EmpresaDto toDto(Empresa empresa) {
        return new EmpresaDto(empresa.getId(), empresa.getNombre());
    }
}
