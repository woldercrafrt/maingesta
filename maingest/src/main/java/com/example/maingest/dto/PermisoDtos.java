package com.example.maingest.dto;

public class PermisoDtos {

    public record PermisoDto(
            Long id,
            String nombre,
            String area,
            Integer codigo
    ) {
    }

    public record PermisoCreateDto(
            String nombre,
            String area,
            Integer codigo
    ) {
    }
}
