package com.example.maingest.dto;

import java.time.LocalDate;

public class EmpresaSuscripcionDtos {

    public record EmpresaSuscripcionDto(
            Long id,
            Long empresaId,
            String empresaNombre,
            Long planId,
            String planNombre,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Long diasRestantes,
            String estado,
            PlanSuscripcionDtos.PlanSuscripcionDto plan
    ) {
    }

    public record EmpresaSuscripcionCreateDto(
            Long planId,
            LocalDate fechaInicio,
            LocalDate fechaFin
    ) {
    }

    public record EmpresaBloqueoDto(
            Boolean bloqueada,
            String motivo
    ) {
    }
}
