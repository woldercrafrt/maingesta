package com.example.maingest.service;

import com.example.maingest.domain.Permiso;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.RolPermiso;
import com.example.maingest.domain.Usuario;
import com.example.maingest.domain.UsuarioRol;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.AlmacenUsuario;
import com.example.maingest.repository.AlmacenUsuarioRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.PermisoRepository;
import com.example.maingest.repository.RolPermisoRepository;
import com.example.maingest.repository.UsuarioRolRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PermissionService {

    private final UsuarioRolRepository usuarioRolRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final AlmacenUsuarioRepository almacenUsuarioRepository;
    private final PermisoRepository permisoRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final AccessControlService accessControlService;

    public PermissionService(
            UsuarioRolRepository usuarioRolRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            AlmacenUsuarioRepository almacenUsuarioRepository,
            PermisoRepository permisoRepository,
            RolPermisoRepository rolPermisoRepository,
            AccessControlService accessControlService
    ) {
        this.usuarioRolRepository = usuarioRolRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.almacenUsuarioRepository = almacenUsuarioRepository;
        this.permisoRepository = permisoRepository;
        this.rolPermisoRepository = rolPermisoRepository;
        this.accessControlService = accessControlService;
    }

    public boolean hasPermission(Usuario usuario, String area, int codigo) {
        return hasPermissionForRoles(usuario, null, null, area, codigo);
    }

    public boolean hasPermissionForEmpresa(Usuario usuario, Empresa empresa, String area, int codigo) {
        return hasPermissionForRoles(usuario, empresa, null, area, codigo);
    }

    public boolean hasPermissionForAlmacen(Usuario usuario, Almacen almacen, String area, int codigo) {
        Empresa empresa = almacen != null ? almacen.getEmpresa() : null;
        return hasPermissionForRoles(usuario, empresa, almacen, area, codigo);
    }

    private boolean hasPermissionForRoles(Usuario usuario, Empresa empresa, Almacen almacen, String area, int codigo) {
        if (usuario == null) {
            return false;
        }
        if (accessControlService.isSuperAdmin(usuario)) {
            return true;
        }
        Permiso permiso = permisoRepository.findByAreaAndCodigo(area, codigo).orElse(null);
        if (permiso == null) {
            return false;
        }
        Long permisoId = permiso.getId();
        
        List<Rol> roles;
        if (empresa == null && almacen == null) {
            // Check global and all company roles (generic permission check)
            roles = getAllRoles(usuario);
        } else {
            // Check specific context
            roles = collectRoles(usuario, empresa, almacen);
        }

        if (roles.isEmpty()) {
            return false;
        }
        for (Rol rol : roles) {
            List<RolPermiso> enlaces = rolPermisoRepository.findByRol(rol);
            for (RolPermiso rp : enlaces) {
                Permiso p = rp.getPermiso();
                if (p != null && permisoId.equals(p.getId())) {
                    return true;
                }
            }
        }
        return false;
    }

    public List<String> getPermissionAuthorities(Usuario usuario) {
        if (usuario == null) {
            return List.of();
        }
        List<Rol> roles = getAllRoles(usuario);
        if (roles.isEmpty()) {
            return List.of();
        }
        Set<String> authorities = new HashSet<>();
        for (Rol rol : roles) {
            List<RolPermiso> enlaces = rolPermisoRepository.findByRol(rol);
            for (RolPermiso rp : enlaces) {
                Permiso permiso = rp.getPermiso();
                if (permiso == null) {
                    continue;
                }
                String nombre = permiso.getNombre();
                String authority;
                if (nombre != null && !nombre.isBlank()) {
                    authority = nombre;
                } else {
                    String area = permiso.getArea();
                    Integer codigo = permiso.getCodigo();
                    if (area == null || codigo == null) {
                        continue;
                    }
                    authority = area + "." + codigo;
                }
                authorities.add(authority);
            }
        }
        return new ArrayList<>(authorities);
    }

    public List<String> getRoleNames(Usuario usuario) {
        if (usuario == null) {
            return List.of();
        }
        return getAllRoles(usuario).stream()
                .map(Rol::getNombre)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
    }

    private List<Rol> getAllRoles(Usuario usuario) {
        Set<Long> rolIds = new HashSet<>();
        List<Rol> roles = new ArrayList<>();

        List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByUsuario(usuario);
        for (UsuarioRol ur : usuarioRoles) {
            Rol rol = ur.getRol();
            if (rol != null && rol.getId() != null && rolIds.add(rol.getId())) {
                roles.add(rol);
            }
        }

        List<EmpresaUsuario> empresaRoles = empresaUsuarioRepository.findByUsuario(usuario);
        for (EmpresaUsuario eu : empresaRoles) {
            Rol rol = eu.getRol();
            if (rol != null && rol.getId() != null && rolIds.add(rol.getId())) {
                roles.add(rol);
            }
        }
        return roles;
    }

    private List<Rol> collectRoles(Usuario usuario, Empresa empresa, Almacen almacen) {
        Set<Long> rolIds = new HashSet<>();
        List<Rol> roles = new ArrayList<>();

        List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByUsuario(usuario);
        for (UsuarioRol ur : usuarioRoles) {
            Rol rol = ur.getRol();
            if (rol == null || rol.getId() == null) {
                continue;
            }
            if (rolIds.add(rol.getId())) {
                roles.add(rol);
            }
        }

        if (empresa != null) {
            List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findAllByEmpresaAndUsuario(empresa, usuario);
            for (EmpresaUsuario relacion : relaciones) {
                Rol rol = relacion != null ? relacion.getRol() : null;
                if (rol != null && rol.getId() != null && rolIds.add(rol.getId())) {
                    roles.add(rol);
                }
            }
        }

        if (almacen != null) {
            List<AlmacenUsuario> relaciones = almacenUsuarioRepository.findAllByAlmacenAndUsuario(almacen, usuario);
            for (AlmacenUsuario relacion : relaciones) {
                Rol rol = relacion != null ? relacion.getRol() : null;
                if (rol != null && rol.getId() != null && rolIds.add(rol.getId())) {
                    roles.add(rol);
                }
            }
        }

        return roles;
    }

    public String uiRoleForUsuario(Usuario usuario) {
        if (usuario == null) {
            return "USUARIO_EMPRESA";
        }
        if (accessControlService.isSuperAdmin(usuario)) {
            return "ADMIN";
        }
        boolean hasUsuarioPermisos =
                hasGlobalOrCompanyPermission(usuario, "USUARIO", 1)
                        || hasGlobalOrCompanyPermission(usuario, "USUARIO", 2)
                        || hasGlobalOrCompanyPermission(usuario, "USUARIO", 3)
                        || hasGlobalOrCompanyPermission(usuario, "USUARIO", 4)
                        || hasGlobalOrCompanyPermission(usuario, "USUARIO", 5);
        boolean hasEmpresaPermisos =
                hasGlobalOrCompanyPermission(usuario, "EMPRESA", 1)
                        || hasGlobalOrCompanyPermission(usuario, "EMPRESA", 2)
                        || hasGlobalOrCompanyPermission(usuario, "EMPRESA", 3)
                        || hasGlobalOrCompanyPermission(usuario, "EMPRESA", 4);
        boolean hasRolPermisos =
                hasGlobalOrCompanyPermission(usuario, "ROL", 1)
                        || hasGlobalOrCompanyPermission(usuario, "ROL", 2)
                        || hasGlobalOrCompanyPermission(usuario, "ROL", 3)
                        || hasGlobalOrCompanyPermission(usuario, "ROL", 4);
        if (hasUsuarioPermisos || hasEmpresaPermisos || hasRolPermisos) {
            return "ADMIN_EMPRESA";
        }
        return "USUARIO_EMPRESA";
    }

    private boolean hasGlobalOrCompanyPermission(Usuario usuario, String area, int codigo) {
        if (usuario == null) {
            return false;
        }
        if (accessControlService.isSuperAdmin(usuario)) {
            return true;
        }
        Permiso permiso = permisoRepository.findByAreaAndCodigo(area, codigo).orElse(null);
        if (permiso == null) {
            return false;
        }
        Long permisoId = permiso.getId();
        List<Rol> roles = getAllRoles(usuario);
        if (roles.isEmpty()) {
            return false;
        }
        for (Rol rol : roles) {
            List<RolPermiso> enlaces = rolPermisoRepository.findByRol(rol);
            for (RolPermiso rp : enlaces) {
                Permiso p = rp.getPermiso();
                if (p != null && permisoId.equals(p.getId())) {
                    return true;
                }
            }
        }
        return false;
    }
}
