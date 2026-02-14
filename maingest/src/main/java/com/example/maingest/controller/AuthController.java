package com.example.maingest.controller;

import com.example.maingest.domain.Usuario;
import com.example.maingest.dto.UsuarioDtos.UsuarioDto;
import com.example.maingest.repository.UsuarioRepository;
import com.example.maingest.security.JwtService;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;

    public AuthController(
            UsuarioRepository usuarioRepository,
            JwtService jwtService,
            AccessControlService accessControlService,
            PermissionService permissionService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
        this.accessControlService = accessControlService;
        this.permissionService = permissionService;
    }

    public record LoginRequest(String correo, String clave) {
    }

    public record LoginResponse(String token, UsuarioDto usuario, String role, List<String> roles) {
    }

    public record MeResponse(Long id, String correo, String nombre, String foto, String role, List<String> permisos, List<String> roles) {
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(request.correo());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Usuario usuario = usuarioOpt.get();
        if (!usuario.getClave().equals(request.clave())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        accessControlService.ensureInitialSuperAdmin(usuario);
        String token = jwtService.generateToken(usuario);
        UsuarioDto usuarioDto = new UsuarioDto(
                usuario.getId(),
                usuario.getCorreo(),
                usuario.getNombre(),
                usuario.getEstado(),
                usuario.getFoto(),
                Collections.emptyList(),
                Collections.emptyList(),
                null,
                null
        );
        String role = permissionService.uiRoleForUsuario(usuario);
        List<String> roles = permissionService.getRoleNames(usuario);
        return ResponseEntity.ok(new LoginResponse(token, usuarioDto, role, roles));
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        Usuario usuario = currentUsuario();
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = permissionService.uiRoleForUsuario(usuario);
        List<String> permisos = permissionService.getPermissionAuthorities(usuario);
        List<String> roles = permissionService.getRoleNames(usuario);
        return ResponseEntity.ok(new MeResponse(usuario.getId(), usuario.getCorreo(), usuario.getNombre(), usuario.getFoto(), role, permisos, roles));
    }

    @PostMapping("/init")
    public ResponseEntity<LoginResponse> init() {
        // Verificar si ya existe algún usuario
        long totalUsuarios = usuarioRepository.count();
        if (totalUsuarios > 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        
        // Crear el usuario inicial SUPER_ADMIN
        Usuario usuario = new Usuario();
        usuario.setCorreo("admin@maingest.com");
        usuario.setClave("admin");
        usuario.setNombre("Administrador");
        usuario.setEstado("ACTIVO");
        Usuario guardado = usuarioRepository.save(usuario);
        
        // Asegurar que sea SUPER_ADMIN
        accessControlService.ensureInitialSuperAdmin(guardado);
        
        // Generar token
        String token = jwtService.generateToken(guardado);
        UsuarioDto usuarioDto = new UsuarioDto(
                guardado.getId(),
                guardado.getCorreo(),
                guardado.getNombre(),
                guardado.getEstado(),
                guardado.getFoto(),
                Collections.emptyList(),
                Collections.emptyList(),
                null,
                null
        );
        String role = permissionService.uiRoleForUsuario(guardado);
        List<String> roles = permissionService.getRoleNames(guardado);
        return ResponseEntity.ok(new LoginResponse(token, usuarioDto, role, roles));
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
}
