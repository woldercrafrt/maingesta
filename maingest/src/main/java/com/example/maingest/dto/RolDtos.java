package com.example.maingest.dto;

public class RolDtos {

    public record RolDto(
            Long id,
            String nombre,
            String descripcion,
            Long empresaId,
            String empresaNombre
    ) {
    }

    public record RolCreateDto(
            String nombre,
            String descripcion,
            Long empresaId
    ) {
    }
}
