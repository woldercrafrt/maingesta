package com.example.maingest.domain;

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

import java.time.Instant;

@Entity
@Table(name = "MOVIMIENTO_INVENTARIO", indexes = {
        @Index(name = "idx_mov_empresa_fecha", columnList = "empresa_id, fecha"),
        @Index(name = "idx_mov_producto", columnList = "producto_id"),
        @Index(name = "idx_mov_usuario", columnList = "usuario_id"),
        @Index(name = "idx_mov_fecha", columnList = "fecha")
})
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repisa_origen_id")
    private Repisa repisaOrigen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repisa_destino_id")
    private Repisa repisaDestino;

    @Column(name = "cantidad_movida", nullable = false)
    private Integer cantidadMovida;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimiento tipo;

    @Column(name = "referencia_documento_id")
    private String referenciaDocumentoId;

    @Column(length = 500)
    private String observacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private Instant fecha;

    public MovimientoInventario() {
        this.fecha = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Empresa getEmpresa() {
        return empresa;
    }

    public void setEmpresa(Empresa empresa) {
        this.empresa = empresa;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public Repisa getRepisaOrigen() {
        return repisaOrigen;
    }

    public void setRepisaOrigen(Repisa repisaOrigen) {
        this.repisaOrigen = repisaOrigen;
    }

    public Repisa getRepisaDestino() {
        return repisaDestino;
    }

    public void setRepisaDestino(Repisa repisaDestino) {
        this.repisaDestino = repisaDestino;
    }

    public Integer getCantidadMovida() {
        return cantidadMovida;
    }

    public void setCantidadMovida(Integer cantidadMovida) {
        this.cantidadMovida = cantidadMovida;
    }

    public TipoMovimiento getTipo() {
        return tipo;
    }

    public void setTipo(TipoMovimiento tipo) {
        this.tipo = tipo;
    }

    public String getReferenciaDocumentoId() {
        return referenciaDocumentoId;
    }

    public void setReferenciaDocumentoId(String referenciaDocumentoId) {
        this.referenciaDocumentoId = referenciaDocumentoId;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public Instant getFecha() {
        return fecha;
    }

    public void setFecha(Instant fecha) {
        this.fecha = fecha;
    }
}
