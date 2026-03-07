package com.example.maingest.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductoDtos {

    public record ProductoCreateDto(
            @NotNull(message = "empresaId es requerido")
            Long empresaId,

            @Size(max = 50, message = "SKU no puede exceder 50 caracteres")
            String sku,

            @NotBlank(message = "nombre es requerido")
            @Size(max = 255, message = "nombre no puede exceder 255 caracteres")
            String nombre,

            String descripcion,

            @DecimalMin(value = "0.0", message = "precioBase no puede ser negativo")
            BigDecimal precioBase,

            String unidadMedida
    ) {
    }

    public record ProductoUpdateDto(
            @Size(max = 255, message = "nombre no puede exceder 255 caracteres")
            String nombre,

            String descripcion,

            @DecimalMin(value = "0.0", message = "precioBase no puede ser negativo")
            BigDecimal precioBase,

            String unidadMedida,
            Boolean activo
    ) {
    }

    public record ProductoResponseDto(
            Long id,
            Long empresaId,
            String empresaNombre,
            String sku,
            String nombre,
            String descripcion,
            BigDecimal precioBase,
            String unidadMedida,
            Boolean activo,
            LocalDateTime createdAt
    ) {
    }
}
