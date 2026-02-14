package com.example.maingest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class EmpresaUsuarioId implements Serializable {

    @Column(name = "empresa_id")
    private Long empresaId;

    @Column(name = "usuario_id")
    private Long usuarioId;

    public EmpresaUsuarioId() {
    }

    public EmpresaUsuarioId(Long empresaId, Long usuarioId) {
        this.empresaId = empresaId;
        this.usuarioId = usuarioId;
    }

    public Long getEmpresaId() {
        return empresaId;
    }

    public void setEmpresaId(Long empresaId) {
        this.empresaId = empresaId;
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
        EmpresaUsuarioId that = (EmpresaUsuarioId) o;
        return Objects.equals(empresaId, that.empresaId) && Objects.equals(usuarioId, that.usuarioId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(empresaId, usuarioId);
    }
}

