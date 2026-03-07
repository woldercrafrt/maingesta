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
}

