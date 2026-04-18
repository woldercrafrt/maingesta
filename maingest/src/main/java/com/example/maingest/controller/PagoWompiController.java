package com.example.maingest.controller;

import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.PagoWompiDtos.WompiCheckoutCreateRequest;
import com.example.maingest.dto.PagoWompiDtos.WompiCheckoutCreateResponse;
import com.example.maingest.dto.PagoWompiDtos.WompiConfirmRequest;
import com.example.maingest.dto.PagoWompiDtos.WompiConfirmResponse;
import com.example.maingest.service.WompiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pagos/wompi")
public class PagoWompiController {

    private static final Logger log = LoggerFactory.getLogger(PagoWompiController.class);

    private final WompiService wompiService;

    public PagoWompiController(WompiService wompiService) {
        this.wompiService = wompiService;
    }

    private Usuario currentUsuario() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Usuario usuario) {
            return usuario;
        }
        return null;
    }

    @PostMapping("/checkout")
    public ResponseEntity<WompiCheckoutCreateResponse> crearCheckout(@RequestBody WompiCheckoutCreateRequest request) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            WompiCheckoutCreateResponse response = wompiService.crearCheckout(
                    actor,
                    request.empresaId(),
                    request.planId(),
                    request.duracionMeses()
            );
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            log.warn("Checkout Wompi forbidden (actorId={}, empresaId={}, planId={}): {}",
                    actor != null ? actor.getId() : null,
                    request != null ? request.empresaId() : null,
                    request != null ? request.planId() : null,
                    e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            log.warn("Checkout Wompi inválido (empresaId={}, planId={}, duracionMeses={}): {}",
                    request != null ? request.empresaId() : null,
                    request != null ? request.planId() : null,
                    request != null ? request.duracionMeses() : null,
                    e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            log.error("Checkout Wompi falló por configuración/estado (empresaId={}, planId={}, duracionMeses={}): {}",
                    request != null ? request.empresaId() : null,
                    request != null ? request.planId() : null,
                    request != null ? request.duracionMeses() : null,
                    e.getMessage(),
                    e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            log.error("Error inesperado creando checkout Wompi (empresaId={}, planId={}, duracionMeses={}): {}",
                    request != null ? request.empresaId() : null,
                    request != null ? request.planId() : null,
                    request != null ? request.duracionMeses() : null,
                    e.getMessage(),
                    e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/confirmar")
    public ResponseEntity<WompiConfirmResponse> confirmar(@RequestBody WompiConfirmRequest request) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            WompiConfirmResponse response = wompiService.confirmarPago(actor, request.transactionId());
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody(required = false) String body,
            @RequestHeader(value = "X-Event-Checksum", required = false) String checksum
    ) {
        try {
            wompiService.procesarWebhook(body, checksum);
        } catch (Exception ignored) {
        }
        return ResponseEntity.ok().build();
    }
}
