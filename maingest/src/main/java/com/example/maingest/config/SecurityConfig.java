package com.example.maingest.config;

import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.UsuarioRepository;
import com.example.maingest.security.JwtAuthenticationFilter;
import com.example.maingest.security.JwtService;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.PermissionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final String frontendBaseUrl;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            @Value("${app.frontend.base-url}") String frontendBaseUrl
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Bean
    public AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler(
            UsuarioRepository usuarioRepository,
            JwtService jwtService,
            AccessControlService accessControlService,
            PermissionService permissionService
    ) {
        return (request, response, authentication) -> {
            if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
                response.sendRedirect("/");
                return;
            }
            OAuth2User oauthUser = oauthToken.getPrincipal();
            Map<String, Object> attributes = oauthUser.getAttributes();
            Object emailObj = attributes.get("email");
            if (emailObj == null) {
                emailObj = attributes.get("preferred_username");
            }
            if (!(emailObj instanceof String email) || email.isBlank()) {
                response.sendRedirect("/login?error=social");
                return;
            }
            Object nameObj = attributes.get("name");
            String name = nameObj instanceof String n && !n.isBlank() ? n : email;
            Object pictureObj = attributes.get("picture");
            String picture = pictureObj instanceof String p && !p.isBlank() ? p : null;

            Optional<Usuario> existing = usuarioRepository.findByCorreo(email);
            Usuario usuario = existing.orElseGet(() -> {
                Usuario u = new Usuario();
                u.setCorreo(email);
                u.setNombre(name);
                u.setEstado("ACTIVO");
                u.setClave("OAUTH2");
                u.setFoto(picture);
                return usuarioRepository.save(u);
            });
            
            // Update photo if it changed (or if user already existed but didn't have photo)
            if (picture != null && !picture.equals(usuario.getFoto())) {
                usuario.setFoto(picture);
                usuario = usuarioRepository.save(usuario);
            }

            accessControlService.ensureInitialSuperAdmin(usuario);
            String token = jwtService.generateToken(usuario);
            String role = permissionService.uiRoleForUsuario(usuario);

            String redirectUrl = frontendBaseUrl
                    + "/login"
                    + "?social=1"
                    + "&token=" + URLEncoder.encode(token, StandardCharsets.UTF_8)
                    + "&role=" + URLEncoder.encode(role, StandardCharsets.UTF_8)
                    + "&id=" + URLEncoder.encode(String.valueOf(usuario.getId()), StandardCharsets.UTF_8)
                    + "&nombre=" + URLEncoder.encode(usuario.getNombre(), StandardCharsets.UTF_8)
                    + "&correo=" + URLEncoder.encode(usuario.getCorreo(), StandardCharsets.UTF_8)
                    + (picture != null ? "&foto=" + URLEncoder.encode(picture, StandardCharsets.UTF_8) : "");
            response.sendRedirect(redirectUrl);
        };
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler
    ) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(exceptions -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                request -> {
                                    String uri = request.getRequestURI();
                                    return uri != null && uri.startsWith("/api/");
                                }
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/oauth2/authorization/**", "/login/oauth2/code/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth -> oauth
                        .successHandler(oauth2AuthenticationSuccessHandler)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(requestLoggingFilter(), JwtAuthenticationFilter.class);
        return http.build();
    }

    private OncePerRequestFilter requestLoggingFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(
                    HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain filterChain
            ) throws ServletException, IOException {
                long start = System.currentTimeMillis();
                try {
                    filterChain.doFilter(request, response);
                } finally {
                    String uri = request.getRequestURI();
                    if (uri != null && uri.startsWith("/api/")) {
                        String origin = request.getHeader("Origin");
                        String authHeader = request.getHeader("Authorization");
                        boolean hasAuthHeader = authHeader != null && !authHeader.isBlank();
                        boolean isBearer = hasAuthHeader && authHeader.startsWith("Bearer ");
                        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                        Object principal = auth != null ? auth.getPrincipal() : null;
                        String actor = principal instanceof Usuario u ? String.valueOf(u.getId()) : "anon";
                        long ms = System.currentTimeMillis() - start;
                        log.info("api {} {} -> {} actor={} authHeader={} bearer={} origin={} {}ms",
                                request.getMethod(),
                                uri,
                                response.getStatus(),
                                actor,
                                hasAuthHeader,
                                isBearer,
                                origin,
                                ms
                        );
                    }
                }
            }
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "https://localhost:5173",
                "https://127.0.0.1:5173",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://localhost:4321",
                "https://127.0.0.1:4321",
                "http://localhost:4321",
                "http://127.0.0.1:4321"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
