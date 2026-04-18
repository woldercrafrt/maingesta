package com.example.maingest.dto;

public class PagoWompiDtos {

    public record WompiCheckoutCreateRequest(
            Long empresaId,
            Long planId,
            Integer duracionMeses
    ) {
    }

    public record WompiCheckoutCreateResponse(
            String checkoutUrl,
            String reference,
            Long amountInCents,
            String currency,
            String publicKey,
            String signatureIntegrity,
            String redirectUrl
    ) {
    }

    public record WompiConfirmRequest(
            String transactionId
    ) {
    }

    public record WompiConfirmResponse(
            String estado,
            String wompiStatus,
            String reference,
            Long empresaSuscripcionId
    ) {
    }
}
