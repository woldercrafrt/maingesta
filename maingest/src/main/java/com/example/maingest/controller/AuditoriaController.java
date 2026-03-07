package com.example.maingest.controller;

import com.example.maingest.domain.AuditoriaEvento;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.AuditoriaService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;
    private final AccessControlService accessControlService;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;

    public AuditoriaController(
            AuditoriaService auditoriaService,
            AccessControlService accessControlService,
            EmpresaUsuarioRepository empresaUsuarioRepository
    ) {
        this.auditoriaService = auditoriaService;
        this.accessControlService = accessControlService;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
    }

    public record AuditoriaEventoDto(
            Long id,
            Long usuarioId,
            String usuarioCorreo,
            String accion,
            String objetoTipo,
            Long objetoId,
            String descripcion,
            String detallesJson,
            Instant creadoEn
    ) {
    }

    public record AuditoriaPaginadaDto(
            List<AuditoriaEventoDto> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    @GetMapping
    public ResponseEntity<AuditoriaPaginadaDto> listar(
            @RequestParam(name = "usuarioCorreo", required = false) String usuarioCorreo,
            @RequestParam(name = "objetoTipo", required = false) String objetoTipo,
            @RequestParam(name = "accion", required = false) String accion,
            @RequestParam(name = "texto", required = false) String texto,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);

        Page<AuditoriaEvento> eventos;
        if (accessControlService.isSuperAdmin(actor)) {
            eventos = auditoriaService.buscar(usuarioCorreo, objetoTipo, accion, texto, pageable);
        } else {
            List<EmpresaUsuario> relacionesActor = empresaUsuarioRepository.findByUsuario(actor);
            if (relacionesActor.isEmpty()) {
                return ResponseEntity.ok(new AuditoriaPaginadaDto(List.of(), 0, safeSize, 0, 0));
            }
            List<Empresa> empresasActor = relacionesActor.stream()
                    .map(EmpresaUsuario::getEmpresa)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            if (empresasActor.isEmpty()) {
                return ResponseEntity.ok(new AuditoriaPaginadaDto(List.of(), 0, safeSize, 0, 0));
            }
            Set<Long> usuarioIdsPermitidos = empresasActor.stream()
                    .flatMap(empresa -> empresaUsuarioRepository.findByEmpresa(empresa).stream())
                    .map(EmpresaUsuario::getUsuario)
                    .filter(Objects::nonNull)
                    .map(Usuario::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            if (usuarioIdsPermitidos.isEmpty()) {
                return ResponseEntity.ok(new AuditoriaPaginadaDto(List.of(), 0, safeSize, 0, 0));
            }
            eventos = auditoriaService.buscarPorUsuarios(usuarioIdsPermitidos, usuarioCorreo, objetoTipo, accion, texto, pageable);
        }

        List<AuditoriaEventoDto> content = eventos.getContent().stream()
                .map(this::toDto)
                .toList();
        AuditoriaPaginadaDto respuesta = new AuditoriaPaginadaDto(
                content, eventos.getNumber(), eventos.getSize(), eventos.getTotalElements(), eventos.getTotalPages()
        );
        return ResponseEntity.ok(respuesta);
    }

    private AuditoriaEventoDto toDto(AuditoriaEvento evento) {
        return new AuditoriaEventoDto(
                evento.getId(),
                evento.getUsuarioId(),
                evento.getUsuarioCorreo(),
                evento.getAccion(),
                evento.getObjetoTipo(),
                evento.getObjetoId(),
                evento.getDescripcion(),
                evento.getDetallesJson(),
                evento.getCreadoEn()
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
