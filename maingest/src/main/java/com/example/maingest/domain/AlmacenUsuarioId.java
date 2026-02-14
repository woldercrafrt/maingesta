package com.example.maingest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class AlmacenUsuarioId implements Serializable {

    @Column(name = "almacen_id")
    private Long almacenId;

    @Column(name = "usuario_id")
    private Long usuarioId;

    public AlmacenUsuarioId() {
    }

    public AlmacenUsuarioId(Long almacenId, Long usuarioId) {
        this.almacenId = almacenId;
        this.usuarioId = usuarioId;
    }

    public Long getAlmacenId() {
        return almacenId;
    }

    public void setAlmacenId(Long almacenId) {
        this.almacenId = almacenId;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AlmacenUsuarioId that = (AlmacenUsuarioId) o;
        return Objects.equals(almacenId, that.almacenId) && Objects.equals(usuarioId, that.usuarioId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(almacenId, usuarioId);
    }
}

