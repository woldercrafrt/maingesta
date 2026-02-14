package com.example.maingest.dto;

import java.util.List;

public class UsuarioDtos {

    public record UsuarioDto(
            Long id,
            String correo,
            String nombre,
            String estado,
            String foto,
            List<String> roles,
            List<String> empresas,
            String empresaNombre,
            String empresaRolNombre
    ) {
    }

    public record UsuarioCreateDto(
            String correo,
            String clave,
            String nombre,
            String estado
    ) {
    }
}
