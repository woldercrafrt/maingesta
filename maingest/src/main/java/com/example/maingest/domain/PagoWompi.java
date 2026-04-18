package com.example.maingest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "PAGO_WOMPI", indexes = {
        @Index(name = "idx_pago_wompi_reference", columnList = "reference"),
        @Index(name = "idx_pago_wompi_tx", columnList = "wompi_transaction_id")
})
public class PagoWompi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private PlanSuscripcion plan;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "amount_in_cents", nullable = false)
    private Long amountInCents;

    @Column(nullable = false, length = 3)
    private String currency = "COP";

    @Column(name = "duracion_meses", nullable = false)
    private Integer duracionMeses;

    @Column(nullable = false)
    private String estado = "CREADA";

    @Column(name = "wompi_transaction_id")
    private String wompiTransactionId;

    @Column(name = "wompi_status")
    private String wompiStatus;

    @Column(nullable = false)
    private Boolean aplicada = false;

    @Column(name = "empresa_suscripcion_id")
    private Long empresaSuscripcionId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public PagoWompi() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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

    public PlanSuscripcion getPlan() {
        return plan;
    }

    public void setPlan(PlanSuscripcion plan) {
        this.plan = plan;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public Long getAmountInCents() {
        return amountInCents;
    }

    public void setAmountInCents(Long amountInCents) {
        this.amountInCents = amountInCents;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Integer getDuracionMeses() {
        return duracionMeses;
    }

    public void setDuracionMeses(Integer duracionMeses) {
        this.duracionMeses = duracionMeses;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getWompiTransactionId() {
        return wompiTransactionId;
    }

    public void setWompiTransactionId(String wompiTransactionId) {
        this.wompiTransactionId = wompiTransactionId;
    }

    public String getWompiStatus() {
        return wompiStatus;
    }

    public void setWompiStatus(String wompiStatus) {
        this.wompiStatus = wompiStatus;
    }

    public Boolean getAplicada() {
        return aplicada;
    }

    public void setAplicada(Boolean aplicada) {
        this.aplicada = aplicada;
    }

    public Long getEmpresaSuscripcionId() {
        return empresaSuscripcionId;
    }

    public void setEmpresaSuscripcionId(Long empresaSuscripcionId) {
        this.empresaSuscripcionId = empresaSuscripcionId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
