package com.example.maingest.repository;

import com.example.maingest.domain.PlanSuscripcion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlanSuscripcionRepository extends JpaRepository<PlanSuscripcion, Long> {
    Optional<PlanSuscripcion> findByNombre(String nombre);
}
