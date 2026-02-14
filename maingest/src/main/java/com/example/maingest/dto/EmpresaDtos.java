package com.example.maingest.dto;

public class EmpresaDtos {

    public record EmpresaDto(
            Long id,
            String nombre
    ) {
    }

    public record EmpresaCreateDto(
            String nombre
    ) {
    }
}

