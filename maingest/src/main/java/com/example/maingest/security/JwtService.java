package com.example.maingest.security;

import com.example.maingest.domain.Usuario;
import com.example.maingest.service.PermissionService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final int MIN_SECRET_LENGTH = 32;

    private final String secretKey;
    private final long expirationMs;
    private final PermissionService permissionService;

    public JwtService(
            @Value("${app.jwt.secret}") String secretKey,
            @Value("${app.jwt.expiration-ms}") long expirationMs,
            PermissionService permissionService
    ) {
        this.secretKey = secretKey;
        this.expirationMs = expirationMs;
        this.permissionService = permissionService;
    }

    @PostConstruct
    public void validateConfiguration() {
        String secret = secretKey != null ? secretKey.trim() : "";
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "app.jwt.secret debe tener al menos " + MIN_SECRET_LENGTH + " bytes. "
                    + "Longitud actual: " + secret.getBytes(StandardCharsets.UTF_8).length + " bytes. "
                    + "Configure una clave segura en application.properties o variables de entorno."
            );
        }
        log.info("JWT secret validado correctamente ({} bytes)", secret.getBytes(StandardCharsets.UTF_8).length);
    }

    public String generateToken(Usuario usuario) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);
        List<String> permisos = permissionService.getPermissionAuthorities(usuario);
        return Jwts.builder()
                .setSubject(usuario.getId().toString())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .claim("permisos", permisos)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Long extractUsuarioId(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        String subject = claims.getSubject();
        if (subject == null) {
            return null;
        }
        return Long.parseLong(subject);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        Object permisos = claims.get("permisos");
        if (permisos instanceof List) {
            return (List<String>) permisos;
        }
        return List.of();
    }

    private Key getSigningKey() {
        String secret = secretKey != null ? secretKey.trim() : "";
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
