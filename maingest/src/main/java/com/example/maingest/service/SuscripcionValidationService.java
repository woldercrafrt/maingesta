package com.example.maingest.service;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaSuscripcion;
import com.example.maingest.domain.PlanSuscripcion;
import com.example.maingest.repository.AlmacenRepository;
import com.example.maingest.repository.EmpresaSuscripcionRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.ProductoRepository;
import org.springframework.stereotype.Service;

@Service
public class SuscripcionValidationService {

    private final EmpresaSuscripcionRepository empresaSuscripcionRepository;
    private final AlmacenRepository almacenRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final ProductoRepository productoRepository;

    public SuscripcionValidationService(
            EmpresaSuscripcionRepository empresaSuscripcionRepository,
            AlmacenRepository almacenRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            ProductoRepository productoRepository
    ) {
        this.empresaSuscripcionRepository = empresaSuscripcionRepository;
        this.almacenRepository = almacenRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.productoRepository = productoRepository;
    }

    public static class ValidationResult {
        private final boolean valid;
        private final String errorCode;
        private final String errorMessage;

        private ValidationResult(boolean valid, String errorCode, String errorMessage) {
            this.valid = valid;
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
        }

        public static ValidationResult ok() {
            return new ValidationResult(true, null, null);
        }

        public static ValidationResult error(String errorCode, String errorMessage) {
            return new ValidationResult(false, errorCode, errorMessage);
        }

        public boolean isValid() {
            return valid;
        }

        public String getErrorCode() {
            return errorCode;
        }

        public String getErrorMessage() {
            return errorMessage;
        }
    }

    public ValidationResult validateEmpresaNotBlocked(Empresa empresa) {
        if (empresa == null) {
            return ValidationResult.error("EMPRESA_NOT_FOUND", "Empresa no encontrada");
        }
        if (Boolean.TRUE.equals(empresa.getBloqueada())) {
            String motivo = empresa.getMotivoBloqueo() != null ? empresa.getMotivoBloqueo() : "Sin motivo especificado";
            return ValidationResult.error("EMPRESA_BLOQUEADA", "Empresa bloqueada: " + motivo);
        }
        return ValidationResult.ok();
    }

    public ValidationResult validateCanCreateAlmacen(Empresa empresa) {
        ValidationResult blockedCheck = validateEmpresaNotBlocked(empresa);
        if (!blockedCheck.isValid()) {
            return blockedCheck;
        }

        EmpresaSuscripcion suscripcion = empresaSuscripcionRepository
                .findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA")
                .orElse(null);

        if (suscripcion == null) {
            return ValidationResult.error("SIN_SUSCRIPCION", "La empresa no tiene una suscripción activa");
        }

        PlanSuscripcion plan = suscripcion.getPlan();
        if (plan == null || plan.getLimiteAlmacenes() == null) {
            return ValidationResult.ok();
        }

        long currentCount = almacenRepository.countByEmpresaId(empresa.getId());
        if (currentCount >= plan.getLimiteAlmacenes()) {
            return ValidationResult.error("LIMITE_ALMACENES", 
                    "Límite de almacenes alcanzado (" + plan.getLimiteAlmacenes() + ")");
        }

        return ValidationResult.ok();
    }

    public ValidationResult validateCanCreateArmario(Empresa empresa) {
        ValidationResult blockedCheck = validateEmpresaNotBlocked(empresa);
        if (!blockedCheck.isValid()) {
            return blockedCheck;
        }

        EmpresaSuscripcion suscripcion = empresaSuscripcionRepository
                .findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA")
                .orElse(null);

        if (suscripcion == null) {
            return ValidationResult.error("SIN_SUSCRIPCION", "La empresa no tiene una suscripción activa");
        }

        PlanSuscripcion plan = suscripcion.getPlan();
        if (plan == null || plan.getLimiteArmarios() == null) {
            return ValidationResult.ok();
        }

        long currentCount = almacenRepository.countArmariosByEmpresaId(empresa.getId());
        if (currentCount >= plan.getLimiteArmarios()) {
            return ValidationResult.error("LIMITE_ARMARIOS", 
                    "Límite de armarios alcanzado (" + plan.getLimiteArmarios() + ")");
        }

        return ValidationResult.ok();
    }

    public ValidationResult validateCanCreateRepisa(Empresa empresa) {
        ValidationResult blockedCheck = validateEmpresaNotBlocked(empresa);
        if (!blockedCheck.isValid()) {
            return blockedCheck;
        }

        EmpresaSuscripcion suscripcion = empresaSuscripcionRepository
                .findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA")
                .orElse(null);

        if (suscripcion == null) {
            return ValidationResult.error("SIN_SUSCRIPCION", "La empresa no tiene una suscripción activa");
        }

        PlanSuscripcion plan = suscripcion.getPlan();
        if (plan == null || plan.getLimiteRepisas() == null) {
            return ValidationResult.ok();
        }

        long currentCount = almacenRepository.countRepisasByEmpresaId(empresa.getId());
        if (currentCount >= plan.getLimiteRepisas()) {
            return ValidationResult.error("LIMITE_REPISAS", 
                    "Límite de repisas alcanzado (" + plan.getLimiteRepisas() + ")");
        }

        return ValidationResult.ok();
    }

    public ValidationResult validateCanCreateItem(Empresa empresa) {
        ValidationResult blockedCheck = validateEmpresaNotBlocked(empresa);
        if (!blockedCheck.isValid()) {
            return blockedCheck;
        }

        EmpresaSuscripcion suscripcion = empresaSuscripcionRepository
                .findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA")
                .orElse(null);

        if (suscripcion == null) {
            return ValidationResult.error("SIN_SUSCRIPCION", "La empresa no tiene una suscripción activa");
        }

        PlanSuscripcion plan = suscripcion.getPlan();
        if (plan == null || plan.getLimiteItems() == null) {
            return ValidationResult.ok();
        }

        long currentCount = almacenRepository.countItemsByEmpresaId(empresa.getId());
        if (currentCount >= plan.getLimiteItems()) {
            return ValidationResult.error("LIMITE_ITEMS", 
                    "Límite de items alcanzado (" + plan.getLimiteItems() + ")");
        }

        return ValidationResult.ok();
    }

    public ValidationResult validateCanCreateProducto(Empresa empresa) {
        ValidationResult blockedCheck = validateEmpresaNotBlocked(empresa);
        if (!blockedCheck.isValid()) {
            return blockedCheck;
        }

        EmpresaSuscripcion suscripcion = empresaSuscripcionRepository
                .findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA")
                .orElse(null);

        if (suscripcion == null) {
            return ValidationResult.error("SIN_SUSCRIPCION", "La empresa no tiene una suscripción activa");
        }

        PlanSuscripcion plan = suscripcion.getPlan();
        if (plan == null || plan.getLimiteProductos() == null) {
            return ValidationResult.ok();
        }

        long currentCount = productoRepository.countByEmpresaId(empresa.getId());
        if (currentCount >= plan.getLimiteProductos()) {
            return ValidationResult.error("LIMITE_PRODUCTOS",
                    "Límite de productos alcanzado (" + plan.getLimiteProductos() + ")");
        }

        return ValidationResult.ok();
    }

    public ValidationResult validateCanAssignUsuario(Empresa empresa) {
        ValidationResult blockedCheck = validateEmpresaNotBlocked(empresa);
        if (!blockedCheck.isValid()) {
            return blockedCheck;
        }

        EmpresaSuscripcion suscripcion = empresaSuscripcionRepository
                .findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA")
                .orElse(null);

        if (suscripcion == null) {
            return ValidationResult.error("SIN_SUSCRIPCION", "La empresa no tiene una suscripción activa");
        }

        PlanSuscripcion plan = suscripcion.getPlan();
        if (plan == null || plan.getLimiteUsuarios() == null) {
            return ValidationResult.ok();
        }

        long currentCount = empresaUsuarioRepository.findByEmpresa(empresa).size();
        if (currentCount >= plan.getLimiteUsuarios()) {
            return ValidationResult.error("LIMITE_USUARIOS", 
                    "Límite de usuarios alcanzado (" + plan.getLimiteUsuarios() + ")");
        }

        return ValidationResult.ok();
    }
}
