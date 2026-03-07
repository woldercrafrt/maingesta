package com.example.maingest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "PLAN_SUSCRIPCION")
public class PlanSuscripcion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;

    @Column(nullable = false)
    private String descripcion = "";

    private Integer limiteAlmacenes;

    private Integer limiteArmarios;

    private Integer limiteRepisas;

    private Integer limiteItems;

    private Integer limiteUsuarios;

    private Integer limiteProductos;

    @Column(nullable = false)
    private Boolean activo = true;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Integer getLimiteAlmacenes() {
        return limiteAlmacenes;
    }

    public void setLimiteAlmacenes(Integer limiteAlmacenes) {
        this.limiteAlmacenes = limiteAlmacenes;
    }

    public Integer getLimiteArmarios() {
        return limiteArmarios;
    }

    public void setLimiteArmarios(Integer limiteArmarios) {
        this.limiteArmarios = limiteArmarios;
    }

    public Integer getLimiteRepisas() {
        return limiteRepisas;
    }

    public void setLimiteRepisas(Integer limiteRepisas) {
        this.limiteRepisas = limiteRepisas;
    }

    public Integer getLimiteItems() {
        return limiteItems;
    }

    public void setLimiteItems(Integer limiteItems) {
        this.limiteItems = limiteItems;
    }

    public Integer getLimiteUsuarios() {
        return limiteUsuarios;
    }

    public void setLimiteUsuarios(Integer limiteUsuarios) {
        this.limiteUsuarios = limiteUsuarios;
    }

    public Integer getLimiteProductos() {
        return limiteProductos;
    }

    public void setLimiteProductos(Integer limiteProductos) {
        this.limiteProductos = limiteProductos;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
