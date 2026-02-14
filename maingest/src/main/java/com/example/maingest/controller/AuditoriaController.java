package com.example.maingest.controller;

import com.example.maingest.domain.AuditoriaEvento;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.AuditoriaService;
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

    @GetMapping
    public ResponseEntity<List<AuditoriaEventoDto>> listar(
            @RequestParam(name = "usuarioCorreo", required = false) String usuarioCorreo,
            @RequestParam(name = "objetoTipo", required = false) String objetoTipo,
            @RequestParam(name = "accion", required = false) String accion,
            @RequestParam(name = "texto", required = false) String texto
    ) {
        Usuario actor = currentUsuario();
        List<AuditoriaEvento> eventos = auditoriaService.buscar(usuarioCorreo, objetoTipo, accion, texto);
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!accessControlService.isSuperAdmin(actor)) {
            List<EmpresaUsuario> relacionesActor = empresaUsuarioRepository.findByUsuario(actor);
            if (relacionesActor.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }
            List<Empresa> empresasActor = relacionesActor.stream()
                    .map(EmpresaUsuario::getEmpresa)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            if (empresasActor.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }
            Set<Long> usuarioIdsPermitidos = empresasActor.stream()
                    .flatMap(empresa -> empresaUsuarioRepository.findByEmpresa(empresa).stream())
                    .map(EmpresaUsuario::getUsuario)
                    .filter(Objects::nonNull)
                    .map(Usuario::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            eventos = eventos.stream()
                    .filter(e -> e.getUsuarioId() != null && usuarioIdsPermitidos.contains(e.getUsuarioId()))
                    .toList();
        }
        List<AuditoriaEventoDto> respuesta = eventos.stream()
                .map(this::toDto)
                .toList();
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
