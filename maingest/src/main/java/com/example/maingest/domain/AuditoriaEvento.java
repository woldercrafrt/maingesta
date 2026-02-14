package com.example.maingest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "AUDITORIA_EVENTO")
public class AuditoriaEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(name = "usuario_correo")
    private String usuarioCorreo;

    @Column(nullable = false)
    private String accion;

    @Column(name = "objeto_tipo")
    private String objetoTipo;

    @Column(name = "objeto_id")
    private Long objetoId;

    @Column
    private String descripcion;

    @Lob
    @Column(name = "detalles_json")
    private String detallesJson;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getUsuarioCorreo() {
        return usuarioCorreo;
    }

    public void setUsuarioCorreo(String usuarioCorreo) {
        this.usuarioCorreo = usuarioCorreo;
    }

    public String getAccion() {
        return accion;
    }

    public void setAccion(String accion) {
        this.accion = accion;
    }

    public String getObjetoTipo() {
        return objetoTipo;
    }

    public void setObjetoTipo(String objetoTipo) {
        this.objetoTipo = objetoTipo;
    }

    public Long getObjetoId() {
        return objetoId;
    }

    public void setObjetoId(Long objetoId) {
        this.objetoId = objetoId;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDetallesJson() {
        return detallesJson;
    }

    public void setDetallesJson(String detallesJson) {
        this.detallesJson = detallesJson;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(Instant creadoEn) {
        this.creadoEn = creadoEn;
    }
}

