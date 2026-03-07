package com.example.maingest.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ITEM", indexes = {
        @Index(name = "idx_item_repisa", columnList = "repisa_id"),
        @Index(name = "idx_item_producto", columnList = "producto_id")
})
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Campos legacy (se mantienen para compatibilidad durante migración) ---
    @Column
    private String nombre;

    @Column
    private String estado;

    @Column
    private Integer tamanio;

    @Column(name = "precio", precision = 12, scale = 2)
    private BigDecimal precio;

    // --- Campos nuevos WMS ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id")
    private Producto producto;

    @Column(nullable = false)
    private Integer cantidad = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_stock", length = 20)
    private EstadoStock estadoStock = EstadoStock.DISPONIBLE;

    @Column(length = 50)
    private String lote;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repisa_id", nullable = false)
    private Repisa repisa;

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

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Integer getTamanio() {
        return tamanio;
    }

    public void setTamanio(Integer tamanio) {
        this.tamanio = tamanio;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public void setPrecio(BigDecimal precio) {
        this.precio = precio;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public EstadoStock getEstadoStock() {
        return estadoStock;
    }

    public void setEstadoStock(EstadoStock estadoStock) {
        this.estadoStock = estadoStock;
    }

    public String getLote() {
        return lote;
    }

    public void setLote(String lote) {
        this.lote = lote;
    }

    public LocalDate getFechaVencimiento() {
        return fechaVencimiento;
    }

    public void setFechaVencimiento(LocalDate fechaVencimiento) {
        this.fechaVencimiento = fechaVencimiento;
    }

    public Repisa getRepisa() {
        return repisa;
    }

    public void setRepisa(Repisa repisa) {
        this.repisa = repisa;
    }
}

