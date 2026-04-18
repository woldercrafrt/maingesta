package com.example.maingest.service;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaSuscripcion;
import com.example.maingest.domain.PagoWompi;
import com.example.maingest.domain.PlanSuscripcion;
import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.PagoWompiDtos.WompiCheckoutCreateResponse;
import com.example.maingest.dto.PagoWompiDtos.WompiConfirmResponse;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaSuscripcionRepository;
import com.example.maingest.repository.PagoWompiRepository;
import com.example.maingest.repository.PlanSuscripcionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class WompiService {

    private static final Logger log = LoggerFactory.getLogger(WompiService.class);

    private final EmpresaRepository empresaRepository;
    private final PlanSuscripcionRepository planSuscripcionRepository;
    private final PagoWompiRepository pagoWompiRepository;
    private final EmpresaSuscripcionRepository empresaSuscripcionRepository;
    private final AccessControlService accessControlService;
    private final AuditoriaService auditoriaService;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    private final String frontendBaseUrl;
    private final String wompiPublicKey;
    private final String wompiIntegritySecret;
    private final String wompiEventsSecret;
    private final String wompiEnvironment;

    public WompiService(
            EmpresaRepository empresaRepository,
            PlanSuscripcionRepository planSuscripcionRepository,
            PagoWompiRepository pagoWompiRepository,
            EmpresaSuscripcionRepository empresaSuscripcionRepository,
            AccessControlService accessControlService,
            AuditoriaService auditoriaService,
            ObjectMapper objectMapper,
            @Value("${app.frontend.base-url}") String frontendBaseUrl,
            @Value("${app.wompi.public-key:}") String wompiPublicKey,
            @Value("${app.wompi.integrity-secret:}") String wompiIntegritySecret,
            @Value("${app.wompi.events-secret:}") String wompiEventsSecret,
            @Value("${app.wompi.environment:}") String wompiEnvironment
    ) {
        this.empresaRepository = empresaRepository;
        this.planSuscripcionRepository = planSuscripcionRepository;
        this.pagoWompiRepository = pagoWompiRepository;
        this.empresaSuscripcionRepository = empresaSuscripcionRepository;
        this.accessControlService = accessControlService;
        this.auditoriaService = auditoriaService;
        this.objectMapper = objectMapper;
        this.frontendBaseUrl = frontendBaseUrl;
        this.wompiPublicKey = wompiPublicKey;
        this.wompiIntegritySecret = wompiIntegritySecret;
        this.wompiEventsSecret = wompiEventsSecret;
        this.wompiEnvironment = wompiEnvironment;
    }

    @Transactional
    public WompiCheckoutCreateResponse crearCheckout(Usuario actor, Long empresaId, Long planId, Integer duracionMeses) {
        if (actor == null) {
            throw new IllegalArgumentException("actor requerido");
        }
        if (empresaId == null || planId == null) {
            throw new IllegalArgumentException("empresaId y planId requeridos");
        }
        int meses = duracionMeses != null ? duracionMeses : 1;
        if (meses < 1) {
            throw new IllegalArgumentException("duracionMeses inválida");
        }
        if (wompiPublicKey == null || wompiPublicKey.isBlank()) {
            throw new IllegalStateException("WOMPI public key no configurada");
        }
        if (wompiIntegritySecret == null || wompiIntegritySecret.isBlank()) {
            throw new IllegalStateException("WOMPI integrity secret no configurado");
        }

        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new IllegalArgumentException("empresa no encontrada"));
        if (!accessControlService.canManageEmpresa(actor, empresa)) {
            throw new SecurityException("forbidden");
        }

        PlanSuscripcion plan = planSuscripcionRepository.findById(planId)
                .orElseThrow(() -> new IllegalArgumentException("plan no encontrado"));

        long amountInCents = calculateAmountInCents(plan, meses);
        String currency = "COP";

        String reference = "sp_" + UUID.randomUUID().toString().replace("-", "");
        String signatureIntegrity = sha256Hex(reference + amountInCents + currency + wompiIntegritySecret);

        String redirectUrl = null;
        try {
            URI base = frontendBaseUrl != null ? URI.create(frontendBaseUrl) : null;
            String host = base != null ? base.getHost() : null;
            String scheme = base != null ? base.getScheme() : null;
            boolean isLocalhost = host == null
                    || host.equalsIgnoreCase("localhost")
                    || host.equals("127.0.0.1")
                    || host.equals("0.0.0.0");
            boolean isHttps = scheme != null && scheme.equalsIgnoreCase("https");

            if (!isLocalhost && isHttps) {
                redirectUrl = UriComponentsBuilder.fromUriString(frontendBaseUrl)
                        .path("/suscripcion")
                        .build()
                        .toUriString();
            } else {
                log.warn("Wompi redirect-url deshabilitado para frontendBaseUrl='{}' (usa un dominio público https, ej. ngrok, para habilitar redirect)", frontendBaseUrl);
            }
        } catch (Exception e) {
            log.warn("No se pudo construir redirect-url para Wompi desde frontendBaseUrl='{}': {}", frontendBaseUrl, e.getMessage());
        }

        UriComponentsBuilder checkoutBuilder = UriComponentsBuilder.fromUriString("https://checkout.wompi.co/p/")
                .queryParam("public-key", wompiPublicKey)
                .queryParam("currency", currency)
                .queryParam("amount-in-cents", amountInCents)
                .queryParam("reference", reference)
                .queryParam("signature:integrity", signatureIntegrity);

        if (redirectUrl != null && !redirectUrl.isBlank()) {
            checkoutBuilder = checkoutBuilder.queryParam("redirect-url", redirectUrl);
        }

        String checkoutUrl = checkoutBuilder
                .build()
                .encode(StandardCharsets.UTF_8)
                .toUriString();

        PagoWompi pago = new PagoWompi();
        pago.setEmpresa(empresa);
        pago.setPlan(plan);
        pago.setReference(reference);
        pago.setAmountInCents(amountInCents);
        pago.setCurrency(currency);
        pago.setDuracionMeses(meses);
        pago.setEstado("CREADA");
        pago.setUpdatedAt(LocalDateTime.now());
        pagoWompiRepository.save(pago);

        auditoriaService.registrar(
                actor,
                "PAGO_WOMPI_CREAR",
                "EMPRESA",
                empresa.getId(),
                "Creó un checkout Wompi (" + plan.getNombre() + ", " + meses + " meses)",
                null
        );

        return new WompiCheckoutCreateResponse(
                checkoutUrl,
                reference,
                amountInCents,
                currency,
                wompiPublicKey,
                signatureIntegrity,
                redirectUrl
        );
    }

    @Transactional
    public WompiConfirmResponse confirmarPago(Usuario actor, String transactionId) {
        if (actor == null) {
            throw new IllegalArgumentException("actor requerido");
        }
        if (transactionId == null || transactionId.isBlank()) {
            throw new IllegalArgumentException("transactionId requerido");
        }
        if (wompiPublicKey == null || wompiPublicKey.isBlank()) {
            throw new IllegalStateException("WOMPI public key no configurada");
        }
        WompiTransactionInfo tx = getTransactionInfo(transactionId.trim());
        return confirmarPagoInternal(actor, tx);
    }

    @Transactional
    public void procesarWebhook(String body, String checksumHeader) {
        if (body == null || body.isBlank()) {
            return;
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(body);
        } catch (Exception e) {
            return;
        }

        if (wompiEventsSecret == null || wompiEventsSecret.isBlank()) {
            return;
        }
        boolean ok = verifyEventChecksum(root, checksumHeader, wompiEventsSecret);
        if (!ok) {
            return;
        }

        String eventType = root.path("event").asText("");
        if (!"transaction.updated".equals(eventType)) {
            return;
        }

        JsonNode txNode = root.path("data").path("transaction");
        String txId = txNode.path("id").asText(null);
        if (txId == null || txId.isBlank()) {
            return;
        }

        String reference = txNode.path("reference").asText(null);
        String status = txNode.path("status").asText(null);
        Long amount = txNode.path("amount_in_cents").isNumber() ? txNode.path("amount_in_cents").asLong() : null;
        String currency = txNode.path("currency").asText(null);

        if (reference == null || reference.isBlank() || status == null || status.isBlank()) {
            return;
        }

        WompiTransactionInfo info = new WompiTransactionInfo(txId, reference, status, amount, currency);
        actualizarDesdeWompiInternal(null, info);
    }

    protected WompiConfirmResponse confirmarPagoInternal(Usuario actor, WompiTransactionInfo tx) {
        PagoWompi pago = pagoWompiRepository.findByReference(tx.reference()).orElse(null);
        if (pago == null) {
            return new WompiConfirmResponse("NO_ENCONTRADO", tx.status(), tx.reference(), null);
        }
        Empresa empresa = pago.getEmpresa();
        if (empresa == null || !accessControlService.canManageEmpresa(actor, empresa)) {
            throw new SecurityException("forbidden");
        }
        return actualizarDesdeWompiInternal(actor, tx);
    }

    protected WompiConfirmResponse actualizarDesdeWompiInternal(Usuario actor, WompiTransactionInfo tx) {
        PagoWompi pago = pagoWompiRepository.findByReference(tx.reference()).orElse(null);
        if (pago == null) {
            return new WompiConfirmResponse("NO_ENCONTRADO", tx.status(), tx.reference(), null);
        }

        if (tx.amountInCents() != null && pago.getAmountInCents() != null && !pago.getAmountInCents().equals(tx.amountInCents())) {
            pago.setEstado("MONTO_NO_COINCIDE");
            pago.setWompiTransactionId(tx.id());
            pago.setWompiStatus(tx.status());
            pago.setUpdatedAt(LocalDateTime.now());
            pagoWompiRepository.save(pago);
            return new WompiConfirmResponse(pago.getEstado(), tx.status(), tx.reference(), pago.getEmpresaSuscripcionId());
        }

        if (tx.currency() != null && pago.getCurrency() != null && !pago.getCurrency().equalsIgnoreCase(tx.currency())) {
            pago.setEstado("MONEDA_NO_COINCIDE");
            pago.setWompiTransactionId(tx.id());
            pago.setWompiStatus(tx.status());
            pago.setUpdatedAt(LocalDateTime.now());
            pagoWompiRepository.save(pago);
            return new WompiConfirmResponse(pago.getEstado(), tx.status(), tx.reference(), pago.getEmpresaSuscripcionId());
        }

        pago.setWompiTransactionId(tx.id());
        pago.setWompiStatus(tx.status());
        pago.setUpdatedAt(LocalDateTime.now());

        String wompiStatusUpper = tx.status() != null ? tx.status().trim().toUpperCase(Locale.ROOT) : "";
        if ("APPROVED".equals(wompiStatusUpper)) {
            pago.setEstado("APROBADA");
            if (!Boolean.TRUE.equals(pago.getAplicada())) {
                Long suscripcionId = aplicarSuscripcionDesdePago(pago, actor);
                pago.setAplicada(true);
                pago.setEmpresaSuscripcionId(suscripcionId);
            }
        } else if ("DECLINED".equals(wompiStatusUpper)) {
            pago.setEstado("RECHAZADA");
        } else if ("VOIDED".equals(wompiStatusUpper)) {
            pago.setEstado("ANULADA");
        } else if ("ERROR".equals(wompiStatusUpper)) {
            pago.setEstado("ERROR");
        } else {
            pago.setEstado("PENDIENTE");
        }

        pagoWompiRepository.save(pago);
        return new WompiConfirmResponse(pago.getEstado(), tx.status(), tx.reference(), pago.getEmpresaSuscripcionId());
    }

    protected Long aplicarSuscripcionDesdePago(PagoWompi pago, Usuario actor) {
        Empresa empresa = pago.getEmpresa();
        PlanSuscripcion plan = pago.getPlan();
        if (empresa == null || plan == null) {
            return null;
        }

        Optional<EmpresaSuscripcion> activaOpt = empresaSuscripcionRepository
                .findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(empresa, "ACTIVA");
        activaOpt.ifPresent(activa -> {
            activa.setEstado("REEMPLAZADA");
            empresaSuscripcionRepository.save(activa);
        });

        LocalDate inicio = LocalDate.now();
        int meses = pago.getDuracionMeses() != null ? pago.getDuracionMeses() : 1;
        LocalDate fin = inicio.plusMonths(meses);

        EmpresaSuscripcion nueva = new EmpresaSuscripcion();
        nueva.setEmpresa(empresa);
        nueva.setPlan(plan);
        nueva.setFechaInicio(inicio);
        nueva.setFechaFin(fin);
        nueva.setEstado("ACTIVA");
        nueva.setAutoRenovar(false);
        EmpresaSuscripcion guardada = empresaSuscripcionRepository.save(nueva);

        if (actor != null) {
            auditoriaService.registrar(
                    actor,
                    "EMPRESA_SUSCRIPCION_PAGO_WOMPI",
                    "EMPRESA",
                    empresa.getId(),
                    "Activó plan \"" + plan.getNombre() + "\" por pago Wompi",
                    null
            );
        }

        return guardada.getId();
    }

    private long calculateAmountInCents(PlanSuscripcion plan, int meses) {
        if (plan == null) {
            throw new IllegalArgumentException("plan requerido");
        }
        if (meses == 12 && plan.getPrecioAnualCents() != null) {
            if (plan.getPrecioAnualCents() <= 0) {
                throw new IllegalArgumentException("precio anual inválido");
            }
            return plan.getPrecioAnualCents();
        }
        if (plan.getPrecioMensualCents() == null || plan.getPrecioMensualCents() <= 0) {
            throw new IllegalArgumentException("precio mensual no configurado");
        }
        return Math.multiplyExact(plan.getPrecioMensualCents(), (long) meses);
    }

    private String wompiApiBaseUrl() {
        if (wompiEnvironment != null && !wompiEnvironment.isBlank()) {
            String env = wompiEnvironment.trim().toLowerCase(Locale.ROOT);
            if ("sandbox".equals(env)) {
                return "https://sandbox.wompi.co/v1";
            }
            if ("production".equals(env) || "prod".equals(env)) {
                return "https://production.wompi.co/v1";
            }
        }
        if (wompiPublicKey != null && wompiPublicKey.startsWith("pub_test_")) {
            return "https://sandbox.wompi.co/v1";
        }
        return "https://production.wompi.co/v1";
    }

    private WompiTransactionInfo getTransactionInfo(String transactionId) {
        String baseUrl = wompiApiBaseUrl();
        String url = baseUrl + "/transactions/" + transactionId;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Bearer " + wompiPublicKey)
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("wompi status " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.path("data");
            String id = data.path("id").asText(null);
            String reference = data.path("reference").asText(null);
            String status = data.path("status").asText(null);
            Long amount = data.path("amount_in_cents").isNumber() ? data.path("amount_in_cents").asLong() : null;
            String currency = data.path("currency").asText(null);
            if (id == null || reference == null || status == null) {
                throw new IllegalStateException("wompi response inválida");
            }
            return new WompiTransactionInfo(id, reference, status, amount, currency);
        } catch (Exception e) {
            throw new IllegalStateException("no se pudo consultar transacción wompi", e);
        }
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashed) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("sha256 error", e);
        }
    }

    private boolean verifyEventChecksum(JsonNode root, String checksumHeader, String secret) {
        JsonNode signature = root.path("signature");
        JsonNode properties = signature.path("properties");
        long timestamp = signature.path("timestamp").asLong(0);
        String checksum = checksumHeader != null && !checksumHeader.isBlank()
                ? checksumHeader.trim()
                : signature.path("checksum").asText(null);

        if (checksum == null || checksum.isBlank() || timestamp == 0 || !properties.isArray()) {
            return false;
        }

        StringBuilder sb = new StringBuilder();
        JsonNode data = root.path("data");
        for (JsonNode prop : properties) {
            String path = prop.asText(null);
            if (path == null || path.isBlank()) {
                continue;
            }
            String value = extractValueFromPath(data, path);
            sb.append(value != null ? value : "");
        }
        sb.append(timestamp);
        sb.append(secret);
        String calculated = sha256Hex(sb.toString());
        return calculated.equalsIgnoreCase(checksum);
    }

    private String extractValueFromPath(JsonNode root, String path) {
        JsonNode current = root;
        String[] parts = path.split("\\.");
        for (String part : parts) {
            if (current == null) {
                return null;
            }
            current = current.get(part);
        }
        if (current == null || current.isNull()) {
            return null;
        }
        if (current.isTextual()) {
            return current.asText();
        }
        if (current.isNumber()) {
            return current.asText();
        }
        if (current.isBoolean()) {
            return current.asText();
        }
        return current.toString();
    }

    protected record WompiTransactionInfo(
            String id,
            String reference,
            String status,
            Long amountInCents,
            String currency
    ) {
    }
}
