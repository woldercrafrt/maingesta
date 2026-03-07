package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaSuscripcion;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.EmpresaUsuarioId;
import com.example.maingest.domain.PlanSuscripcion;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.EmpresaDtos.EmpresaCreateDto;
import com.example.maingest.dto.EmpresaDtos.EmpresaDto;
import com.example.maingest.dto.EmpresaSuscripcionDtos.EmpresaBloqueoDto;
import com.example.maingest.dto.EmpresaSuscripcionDtos.EmpresaSuscripcionCreateDto;
import com.example.maingest.dto.EmpresaSuscripcionDtos.EmpresaSuscripcionDto;
import com.example.maingest.dto.EmpresaUsuarioDto;
import com.example.maingest.dto.PlanSuscripcionDtos.PlanSuscripcionDto;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaSuscripcionRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.PlanSuscripcionRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/empresas")
public class EmpresaController {

    private final EmpresaRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final EmpresaSuscripcionRepository empresaSuscripcionRepository;
    private final PlanSuscripcionRepository planSuscripcionRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;
    private final AuditoriaService auditoriaService;

    public EmpresaController(
            EmpresaRepository empresaRepository,
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            EmpresaSuscripcionRepository empresaSuscripcionRepository,
            PlanSuscripcionRepository planSuscripcionRepository,
            AccessControlService accessControlService,
            PermissionService permissionService,
            AuditoriaService auditoriaService
    ) {
        this.empresaRepository = empresaRepository;
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.empresaSuscripcionRepository = empresaSuscripcionRepository;
        this.planSuscripcionRepository = planSuscripcionRepository;
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
        return new EmpresaDto(
                empresa.getId(),
                empresa.getNombre(),
                empresa.getBloqueada(),
                empresa.getMotivoBloqueo()
        );
    }

    private PlanSuscripcionDto planToDto(PlanSuscripcion plan) {
        return new PlanSuscripcionDto(
                plan.getId(),
                plan.getNombre(),
                plan.getDescripcion(),
                plan.getLimiteAlmacenes(),
                plan.getLimiteArmarios(),
                plan.getLimiteRepisas(),
                plan.getLimiteItems(),
                plan.getLimiteUsuarios(),
                plan.getActivo()
        );
    }

    private EmpresaSuscripcionDto suscripcionToDto(EmpresaSuscripcion es) {
        long diasRestantes = 0;
        if (es.getFechaFin() != null) {
            diasRestantes = ChronoUnit.DAYS.between(LocalDate.now(), es.getFechaFin());
            if (diasRestantes < 0) {
                diasRestantes = 0;
            }
        }
        return new EmpresaSuscripcionDto(
                es.getId(),
                es.getEmpresa().getId(),
                es.getEmpresa().getNombre(),
                es.getPlan().getId(),
                es.getPlan().getNombre(),
                es.getFechaInicio(),
                es.getFechaFin(),
                diasRestantes,
                es.getEstado(),
                planToDto(es.getPlan())
        );
    }

    @GetMapping("/{id}/suscripcion")
    public ResponseEntity<EmpresaSuscripcionDto> suscripcionActual(@PathVariable("id") Long id) {
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();
        Optional<EmpresaSuscripcion> activaOpt =
                empresaSuscripcionRepository.findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA");
        if (activaOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(suscripcionToDto(activaOpt.get()));
    }

    @GetMapping("/{id}/suscripciones")
    public ResponseEntity<List<EmpresaSuscripcionDto>> historialSuscripciones(@PathVariable("id") Long id) {
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();
        List<EmpresaSuscripcionDto> lista = empresaSuscripcionRepository
                .findByEmpresaOrderByCreatedAtDesc(empresa)
                .stream()
                .map(this::suscripcionToDto)
                .toList();
        return ResponseEntity.ok(lista);
    }

    @PostMapping("/{id}/suscripciones")
    @Transactional
    public ResponseEntity<EmpresaSuscripcionDto> asignarSuscripcion(
            @PathVariable("id") Long id,
            @RequestBody EmpresaSuscripcionCreateDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (dto.planId() == null) {
            return ResponseEntity.badRequest().build();
        }
        Optional<PlanSuscripcion> planOpt = planSuscripcionRepository.findById(dto.planId());
        if (planOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Empresa empresa = empresaOpt.get();
        PlanSuscripcion plan = planOpt.get();

        Optional<EmpresaSuscripcion> activaOpt =
                empresaSuscripcionRepository.findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA");
        activaOpt.ifPresent(activa -> {
            activa.setEstado("REEMPLAZADA");
            empresaSuscripcionRepository.save(activa);
        });

        EmpresaSuscripcion nueva = new EmpresaSuscripcion();
        nueva.setEmpresa(empresa);
        nueva.setPlan(plan);
        nueva.setFechaInicio(dto.fechaInicio() != null ? dto.fechaInicio() : LocalDate.now());
        nueva.setFechaFin(dto.fechaFin());
        nueva.setEstado("ACTIVA");
        EmpresaSuscripcion guardada = empresaSuscripcionRepository.save(nueva);

        auditoriaService.registrar(
                    actor,
                    "EMPRESA_ASIGNAR_SUSCRIPCION",
                    "EMPRESA",
                    empresa.getId(),
                    "Asignó plan \"" + plan.getNombre() + "\" a empresa \"" + empresa.getNombre() + "\"",
                    null
            );
        return ResponseEntity.status(HttpStatus.CREATED).body(suscripcionToDto(guardada));
    }

    @PostMapping("/{id}/bloqueo")
    public ResponseEntity<EmpresaDto> bloquearDesbloquear(
            @PathVariable("id") Long id,
            @RequestBody EmpresaBloqueoDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();
        boolean bloquear = dto.bloqueada() != null && dto.bloqueada();
        empresa.setBloqueada(bloquear);
        empresa.setMotivoBloqueo(bloquear ? (dto.motivo() != null ? dto.motivo() : "") : null);
        empresa.setBloqueadaAt(bloquear ? LocalDateTime.now() : null);
        empresaRepository.save(empresa);

        String accion = bloquear ? "EMPRESA_BLOQUEAR" : "EMPRESA_DESBLOQUEAR";
        String detalle = bloquear
                ? "Bloqueó empresa \"" + empresa.getNombre() + "\"" + (dto.motivo() != null ? ": " + dto.motivo() : "")
                : "Desbloqueó empresa \"" + empresa.getNombre() + "\"";
        auditoriaService.registrar(actor, accion, "EMPRESA", empresa.getId(), detalle, null);
        return ResponseEntity.ok(toDto(empresa));
    }

    @GetMapping("/planes-disponibles")
    public ResponseEntity<List<PlanSuscripcionDto>> planesDisponibles() {
        List<PlanSuscripcionDto> planes = planSuscripcionRepository.findAll()
                .stream()
                .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                .map(this::planToDto)
                .toList();
        return ResponseEntity.ok(planes);
    }
}
