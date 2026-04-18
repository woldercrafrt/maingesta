package com.example.maingest.controller;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaSuscripcion;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.EmpresaUsuarioId;
import com.example.maingest.domain.PlanSuscripcion;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.EmpresaDtos.EmpresaDto;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaSuscripcionRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.service.OnboardingDefaultsService;
import com.example.maingest.service.AuditoriaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/onboarding")
public class OnboardingController {

    private final EmpresaRepository empresaRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final EmpresaSuscripcionRepository empresaSuscripcionRepository;
    private final OnboardingDefaultsService onboardingDefaultsService;
    private final AuditoriaService auditoriaService;

    public OnboardingController(
            EmpresaRepository empresaRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            EmpresaSuscripcionRepository empresaSuscripcionRepository,
            OnboardingDefaultsService onboardingDefaultsService,
            AuditoriaService auditoriaService
    ) {
        this.empresaRepository = empresaRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.empresaSuscripcionRepository = empresaSuscripcionRepository;
        this.onboardingDefaultsService = onboardingDefaultsService;
        this.auditoriaService = auditoriaService;
    }

    public record CreateEmpresaRequest(String nombre) {
    }

    public record CreateEmpresaResponse(EmpresaDto empresa, String planNombre, String rolNombre) {
    }

    @PostMapping("/empresa")
    @Transactional
    public ResponseEntity<CreateEmpresaResponse> crearEmpresaParaUsuarioActual(
            @RequestBody CreateEmpresaRequest request
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (request == null || request.nombre() == null || request.nombre().trim().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        if (!empresaUsuarioRepository.findByUsuario(actor).isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        PlanSuscripcion plan = onboardingDefaultsService.getOrCreateDefaultPlan();
        Rol rolOwner = onboardingDefaultsService.getOrCreateOwnerRoleWithAllPermisos();

        Empresa empresa = new Empresa();
        empresa.setNombre(request.nombre().trim());
        Empresa guardada = empresaRepository.save(empresa);

        EmpresaUsuario eu = new EmpresaUsuario();
        eu.setId(new EmpresaUsuarioId(guardada.getId(), actor.getId()));
        eu.setEmpresa(guardada);
        eu.setUsuario(actor);
        eu.setRol(rolOwner);
        empresaUsuarioRepository.save(eu);

        EmpresaSuscripcion sus = new EmpresaSuscripcion();
        sus.setEmpresa(guardada);
        sus.setPlan(plan);
        sus.setFechaInicio(LocalDate.now());
        sus.setFechaFin(null);
        sus.setEstado("ACTIVA");
        sus.setAutoRenovar(false);
        empresaSuscripcionRepository.save(sus);

        auditoriaService.registrar(
                actor,
                "ONBOARDING_CREAR_EMPRESA",
                "EMPRESA",
                guardada.getId(),
                "Creó su empresa \"" + guardada.getNombre() + "\" con plan \"" + plan.getNombre() + "\"",
                null
        );

        EmpresaDto dto = new EmpresaDto(
                guardada.getId(),
                guardada.getNombre(),
                guardada.getBloqueada(),
                guardada.getMotivoBloqueo()
        );

        CreateEmpresaResponse response = new CreateEmpresaResponse(dto, plan.getNombre(), rolOwner.getNombre());
        return ResponseEntity.created(URI.create("/api/empresas/" + guardada.getId())).body(response);
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
