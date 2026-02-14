package com.example.maingest.security;

import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.UsuarioRepository;
import com.example.maingest.service.PermissionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;
    private final PermissionService permissionService;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UsuarioRepository usuarioRepository,
            PermissionService permissionService
    ) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
        this.permissionService = permissionService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = authHeader.substring(7);
        if (token.isBlank() || "null".equalsIgnoreCase(token) || "undefined".equalsIgnoreCase(token)) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            Long usuarioId = jwtService.extractUsuarioId(token);
            var existingAuth = SecurityContextHolder.getContext().getAuthentication();
            boolean canSetAuth = existingAuth == null || existingAuth instanceof AnonymousAuthenticationToken;
            if (usuarioId != null && canSetAuth) {
                // Crear un usuario simplificado con solo los datos necesarios
                Usuario usuario = new Usuario();
                usuario.setId(usuarioId);
                
                List<String> permisos = jwtService.extractPermissions(token);
                List<SimpleGrantedAuthority> authorities = permisos.stream()
                        .map(SimpleGrantedAuthority::new)
                        .toList();
                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(usuario, null, authorities);
                authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            String uri = request.getRequestURI();
            if (uri != null && uri.startsWith("/api/")) {
                log.warn("jwt invalid {} {} ({}) {}", request.getMethod(), uri, e.getClass().getSimpleName(), e.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}
