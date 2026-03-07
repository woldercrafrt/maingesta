package com.example.maingest.controller;

import com.example.maingest.domain.PlanSuscripcion;
import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.PlanSuscripcionDtos.PlanSuscripcionCreateDto;
import com.example.maingest.dto.PlanSuscripcionDtos.PlanSuscripcionDto;
import com.example.maingest.repository.EmpresaSuscripcionRepository;
import com.example.maingest.repository.PlanSuscripcionRepository;
import com.example.maingest.service.AccessControlService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/planes-suscripcion")
public class PlanSuscripcionController {

    private final PlanSuscripcionRepository planRepository;
    private final EmpresaSuscripcionRepository empresaSuscripcionRepository;
    private final AccessControlService accessControlService;

    public PlanSuscripcionController(
            PlanSuscripcionRepository planRepository,
            EmpresaSuscripcionRepository empresaSuscripcionRepository,
            AccessControlService accessControlService
    ) {
        this.planRepository = planRepository;
        this.empresaSuscripcionRepository = empresaSuscripcionRepository;
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

    private PlanSuscripcionDto toDto(PlanSuscripcion plan) {
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

    @GetMapping
    public ResponseEntity<List<PlanSuscripcionDto>> listar() {
        List<PlanSuscripcionDto> planes = planRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(planes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlanSuscripcionDto> obtener(@PathVariable("id") Long id) {
        return planRepository.findById(id)
                .map(plan -> ResponseEntity.ok(toDto(plan)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PlanSuscripcionDto> crear(@RequestBody PlanSuscripcionCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto.nombre() == null || dto.nombre().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (planRepository.findByNombre(dto.nombre().trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        PlanSuscripcion plan = new PlanSuscripcion();
        plan.setNombre(dto.nombre().trim());
        plan.setDescripcion(dto.descripcion() != null ? dto.descripcion().trim() : "");
        plan.setLimiteAlmacenes(dto.limiteAlmacenes());
        plan.setLimiteArmarios(dto.limiteArmarios());
        plan.setLimiteRepisas(dto.limiteRepisas());
        plan.setLimiteItems(dto.limiteItems());
        plan.setLimiteUsuarios(dto.limiteUsuarios());
        plan.setActivo(true);
        PlanSuscripcion guardado = planRepository.save(plan);
        return ResponseEntity.created(URI.create("/api/planes-suscripcion/" + guardado.getId()))
                .body(toDto(guardado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlanSuscripcionDto> actualizar(
            @PathVariable("id") Long id,
            @RequestBody PlanSuscripcionCreateDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return planRepository.findById(id)
                .map(plan -> {
                    if (dto.nombre() != null && !dto.nombre().isBlank()) {
                        var existente = planRepository.findByNombre(dto.nombre().trim());
                        if (existente.isPresent() && !existente.get().getId().equals(id)) {
                            return ResponseEntity.status(HttpStatus.CONFLICT).body((PlanSuscripcionDto) null);
                        }
                        plan.setNombre(dto.nombre().trim());
                    }
                    if (dto.descripcion() != null) {
                        plan.setDescripcion(dto.descripcion().trim());
                    }
                    plan.setLimiteAlmacenes(dto.limiteAlmacenes());
                    plan.setLimiteArmarios(dto.limiteArmarios());
                    plan.setLimiteRepisas(dto.limiteRepisas());
                    plan.setLimiteItems(dto.limiteItems());
                    plan.setLimiteUsuarios(dto.limiteUsuarios());
                    PlanSuscripcion guardado = planRepository.save(plan);
                    return ResponseEntity.ok(toDto(guardado));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable("id") Long id) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return planRepository.findById(id)
                .map(plan -> {
                    long enUso = empresaSuscripcionRepository.findAll()
                            .stream()
                            .filter(es -> es.getPlan().getId().equals(id) && "ACTIVA".equals(es.getEstado()))
                            .count();
                    if (enUso > 0) {
                        plan.setActivo(false);
                        planRepository.save(plan);
                        return ResponseEntity.ok().<Void>build();
                    }
                    planRepository.delete(plan);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
