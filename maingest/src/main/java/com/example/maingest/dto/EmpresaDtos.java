package com.example.maingest.dto;

public class EmpresaDtos {

    public record EmpresaDto(
            Long id,
            String nombre,
            Boolean bloqueada,
            String motivoBloqueo
    ) {
    }

    public record EmpresaCreateDto(
            String nombre
    ) {
    }

    public record EmpresaUsageDto(
            Long empresaId,
            Long almacenes,
            Long armarios,
            Long repisas,
            Long items,
            Long productos,
            Long usuarios
    ) {
    }
}

