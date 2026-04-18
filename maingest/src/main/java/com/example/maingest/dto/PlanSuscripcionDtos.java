package com.example.maingest.dto;

public class PlanSuscripcionDtos {

    public record PlanSuscripcionDto(
            Long id,
            String nombre,
            String descripcion,
            Long precioMensualCents,
            Long precioAnualCents,
            Integer limiteAlmacenes,
            Integer limiteArmarios,
            Integer limiteRepisas,
            Integer limiteItems,
            Integer limiteUsuarios,
            Boolean activo
    ) {
    }

    public record PlanSuscripcionCreateDto(
            String nombre,
            String descripcion,
            Long precioMensualCents,
            Long precioAnualCents,
            Integer limiteAlmacenes,
            Integer limiteArmarios,
            Integer limiteRepisas,
            Integer limiteItems,
            Integer limiteUsuarios
    ) {
    }
}
