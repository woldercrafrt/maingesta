package com.example.maingest.service;

import com.example.maingest.domain.Permiso;
import com.example.maingest.domain.PlanSuscripcion;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.RolPermiso;
import com.example.maingest.domain.RolPermisoId;
import com.example.maingest.repository.PermisoRepository;
import com.example.maingest.repository.PlanSuscripcionRepository;
import com.example.maingest.repository.RolPermisoRepository;
import com.example.maingest.repository.RolRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class OnboardingDefaultsService {

    private final PlanSuscripcionRepository planSuscripcionRepository;
    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;
    private final RolPermisoRepository rolPermisoRepository;

    @Value("${stockpocket.onboarding.defaultPlanNombre:GRATIS}")
    private String defaultPlanNombre;

    @Value("${stockpocket.onboarding.ownerRoleNombre:PROPIETARIO}")
    private String ownerRoleNombre;

    public OnboardingDefaultsService(
            PlanSuscripcionRepository planSuscripcionRepository,
            RolRepository rolRepository,
            PermisoRepository permisoRepository,
            RolPermisoRepository rolPermisoRepository
    ) {
        this.planSuscripcionRepository = planSuscripcionRepository;
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
        this.rolPermisoRepository = rolPermisoRepository;
    }

    @PostConstruct
    @Transactional
    public void initDefaults() {
        getOrCreateDefaultPlan();
        getOrCreateOwnerRoleWithAllPermisos();
    }

    @Transactional
    public PlanSuscripcion getOrCreateDefaultPlan() {
        String nombre = defaultPlanNombre != null && !defaultPlanNombre.isBlank()
                ? defaultPlanNombre.trim()
                : "GRATIS";

        Optional<PlanSuscripcion> existente = planSuscripcionRepository.findByNombre(nombre);
        if (existente.isPresent()) {
            PlanSuscripcion plan = existente.get();
            if (plan.getActivo() == null || !plan.getActivo()) {
                plan.setActivo(true);
                plan = planSuscripcionRepository.save(plan);
            }
            return plan;
        }

        PlanSuscripcion plan = new PlanSuscripcion();
        plan.setNombre(nombre);
        plan.setDescripcion("Plan gratuito");
        plan.setPrecioMensualCents(0L);
        plan.setPrecioAnualCents(0L);
        plan.setActivo(true);
        return planSuscripcionRepository.save(plan);
    }

    @Transactional
    public Rol getOrCreateOwnerRoleWithAllPermisos() {
        String nombre = ownerRoleNombre != null && !ownerRoleNombre.isBlank()
                ? ownerRoleNombre.trim()
                : "PROPIETARIO";

        Rol rol = rolRepository.findByNombre(nombre).orElseGet(() -> {
            Rol nuevo = new Rol();
            nuevo.setNombre(nombre);
            nuevo.setDescripcion("Propietario / administrador total");
            return rolRepository.save(nuevo);
        });

        List<RolPermiso> actuales = rolPermisoRepository.findByRol(rol);
        Set<Long> permisoIds = new HashSet<>();
        for (RolPermiso rp : actuales) {
            if (rp != null && rp.getPermiso() != null && rp.getPermiso().getId() != null) {
                permisoIds.add(rp.getPermiso().getId());
            }
        }

        List<Permiso> permisos = permisoRepository.findAll();
        for (Permiso permiso : permisos) {
            if (permiso == null || permiso.getId() == null) {
                continue;
            }
            if (permisoIds.contains(permiso.getId())) {
                continue;
            }
            RolPermiso enlace = new RolPermiso();
            RolPermisoId id = new RolPermisoId(rol.getId(), permiso.getId());
            enlace.setId(id);
            enlace.setRol(rol);
            enlace.setPermiso(permiso);
            rolPermisoRepository.save(enlace);
        }

        return rol;
    }
}
