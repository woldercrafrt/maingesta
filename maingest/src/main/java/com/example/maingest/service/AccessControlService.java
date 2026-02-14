package com.example.maingest.service;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.AlmacenUsuario;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.Permiso;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.Usuario;
import com.example.maingest.domain.UsuarioRol;
import com.example.maingest.domain.UsuarioRolId;
import com.example.maingest.repository.AlmacenRepository;
import com.example.maingest.repository.AlmacenUsuarioRepository;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.PermisoRepository;
import com.example.maingest.repository.RolRepository;
import com.example.maingest.repository.UsuarioRepository;
import com.example.maingest.repository.UsuarioRolRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class AccessControlService {

    public enum RoleLevel {
        LECTOR,
        OPERADOR,
        ADMIN_ALMACEN,
        ADMIN_EMPRESA,
        SUPER_ADMIN
    }

    private final UsuarioRepository usuarioRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final AlmacenUsuarioRepository almacenUsuarioRepository;
    private final RolRepository rolRepository;
    private final EmpresaRepository empresaRepository;
    private final AlmacenRepository almacenRepository;
    private final PermisoRepository permisoRepository;

    public AccessControlService(
            UsuarioRepository usuarioRepository,
            UsuarioRolRepository usuarioRolRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            AlmacenUsuarioRepository almacenUsuarioRepository,
            RolRepository rolRepository,
            EmpresaRepository empresaRepository,
            AlmacenRepository almacenRepository,
            PermisoRepository permisoRepository
    ) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.almacenUsuarioRepository = almacenUsuarioRepository;
        this.rolRepository = rolRepository;
        this.empresaRepository = empresaRepository;
        this.almacenRepository = almacenRepository;
        this.permisoRepository = permisoRepository;
    }

    @PostConstruct
    public void initBasePermissions() {
        ensureBasePermissions();
    }

    public Optional<Usuario> findActor(Long actorId) {
        if (actorId == null) {
            return Optional.empty();
        }
        return usuarioRepository.findById(actorId);
    }

    public RoleLevel roleLevelFromRol(Rol rol) {
        if (rol == null || rol.getNombre() == null) {
            return null;
        }
        String nombre = rol.getNombre().toUpperCase(Locale.ROOT);
        try {
            return RoleLevel.valueOf(nombre);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public void ensureInitialSuperAdmin(Usuario usuario) {
        Rol superRol = rolRepository.findByNombre("SUPER_ADMIN").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("SUPER_ADMIN");
            r.setDescripcion("Super administrador");
            return rolRepository.save(r);
        });
        long totalSuperAdmins = usuarioRolRepository.countByRol(superRol);
        if (totalSuperAdmins == 0) {
            UsuarioRolId id = new UsuarioRolId(usuario.getId(), superRol.getId());
            if (!usuarioRolRepository.existsById(id)) {
                UsuarioRol usuarioRol = new UsuarioRol();
                usuarioRol.setId(id);
                usuarioRol.setUsuario(usuario);
                usuarioRol.setRol(superRol);
                usuarioRolRepository.save(usuarioRol);
            }
        }
        ensureBasePermissions();
    }

    private void ensureBasePermissions() {
        ensurePermiso("USUARIO", 1, "usuario.ver");
        ensurePermiso("USUARIO", 2, "usuario.crear");
        ensurePermiso("USUARIO", 3, "usuario.editar");
        ensurePermiso("USUARIO", 4, "usuario.eliminar");
        ensurePermiso("USUARIO", 5, "usuario.roles");

        ensurePermiso("EMPRESA", 1, "empresa.ver");
        ensurePermiso("EMPRESA", 2, "empresa.crear");
        ensurePermiso("EMPRESA", 3, "empresa.editar");
        ensurePermiso("EMPRESA", 4, "empresa.eliminar");

        ensurePermiso("ROL", 1, "rol.ver");
        ensurePermiso("ROL", 2, "rol.crear");
        ensurePermiso("ROL", 3, "rol.editar");
        ensurePermiso("ROL", 4, "rol.eliminar");

        ensurePermiso("ITEM", 1, "item.ver");
        ensurePermiso("ITEM", 2, "item.crear");
        ensurePermiso("ITEM", 3, "item.editar");
        ensurePermiso("ITEM", 4, "item.eliminar");

        ensurePermiso("ALMACEN", 1, "almacen.ver");
        ensurePermiso("ALMACEN", 2, "almacen.crear");
        ensurePermiso("ALMACEN", 3, "almacen.editar");
        ensurePermiso("ALMACEN", 4, "almacen.eliminar");

        ensurePermiso("ARMARIO", 1, "armario.ver");
        ensurePermiso("ARMARIO", 2, "armario.crear");
        ensurePermiso("ARMARIO", 3, "armario.editar");
        ensurePermiso("ARMARIO", 4, "armario.eliminar");

        ensurePermiso("REPISA", 1, "repisa.ver");
        ensurePermiso("REPISA", 2, "repisa.crear");
        ensurePermiso("REPISA", 3, "repisa.editar");
        ensurePermiso("REPISA", 4, "repisa.eliminar");

        ensurePermiso("REPORTE", 1, "reporte.ver");
        ensurePermiso("REPORTE", 2, "reporte.crear");
    }

    private void ensurePermiso(String area, int codigo, String nombre) {
        Optional<Permiso> existente = permisoRepository.findByAreaAndCodigo(area, codigo);
        if (existente.isPresent()) {
            return;
        }
        Permiso permiso = new Permiso();
        permiso.setArea(area);
        permiso.setCodigo(codigo);
        permiso.setNombre(nombre);
        permisoRepository.save(permiso);
    }

    public RoleLevel highestGlobalRole(Usuario usuario) {
        List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByUsuario(usuario);
        RoleLevel result = null;
        for (UsuarioRol ur : usuarioRoles) {
            RoleLevel level = roleLevelFromRol(ur.getRol());
            if (level == null) {
                continue;
            }
            if (result == null || level.ordinal() > result.ordinal()) {
                result = level;
            }
        }
        return result;
    }

    public RoleLevel highestEmpresaRole(Usuario usuario, Empresa empresa) {
        if (usuario == null || empresa == null) {
            return null;
        }
        List<EmpresaUsuario> relaciones = empresaUsuarioRepository.findAllByEmpresaAndUsuario(empresa, usuario);
        RoleLevel result = null;
        for (EmpresaUsuario relacion : relaciones) {
            RoleLevel level = roleLevelFromRol(relacion != null ? relacion.getRol() : null);
            if (level == null) {
                continue;
            }
            if (result == null || level.ordinal() > result.ordinal()) {
                result = level;
            }
        }
        return result;
    }

    public RoleLevel highestAlmacenRole(Usuario usuario, Almacen almacen) {
        if (usuario == null || almacen == null) {
            return null;
        }
        List<AlmacenUsuario> relaciones = almacenUsuarioRepository.findAllByAlmacenAndUsuario(almacen, usuario);
        RoleLevel result = null;
        for (AlmacenUsuario relacion : relaciones) {
            RoleLevel level = roleLevelFromRol(relacion != null ? relacion.getRol() : null);
            if (level == null) {
                continue;
            }
            if (result == null || level.ordinal() > result.ordinal()) {
                result = level;
            }
        }
        return result;
    }

    public RoleLevel effectiveRoleForEmpresa(Usuario usuario, Empresa empresa) {
        RoleLevel global = highestGlobalRole(usuario);
        RoleLevel empresaRole = highestEmpresaRole(usuario, empresa);
        return maxLevel(global, empresaRole);
    }

    public RoleLevel effectiveRoleForAlmacen(Usuario usuario, Almacen almacen) {
        Empresa empresa = almacen.getEmpresa();
        RoleLevel global = highestGlobalRole(usuario);
        RoleLevel empresaRole = highestEmpresaRole(usuario, empresa);
        RoleLevel almacenRole = highestAlmacenRole(usuario, almacen);
        RoleLevel empresaEffective = maxLevel(global, empresaRole);
        return maxLevel(empresaEffective, almacenRole);
    }

    public boolean isSuperAdmin(Usuario usuario) {
        RoleLevel level = highestGlobalRole(usuario);
        return level == RoleLevel.SUPER_ADMIN;
    }

    public boolean canCreateEmpresa(Usuario actor) {
        return isSuperAdmin(actor);
    }

    public boolean canDeleteEmpresa(Usuario actor) {
        return isSuperAdmin(actor);
    }

    public boolean canAssignGlobalRole(Usuario actor, Rol targetRole) {
        RoleLevel actorLevel = highestGlobalRole(actor);
        RoleLevel targetLevel = roleLevelFromRol(targetRole);
        if (actorLevel == null) {
            return false;
        }
        if (targetLevel == null) {
            return isSuperAdmin(actor);
        }
        if (targetLevel == RoleLevel.SUPER_ADMIN && actorLevel != RoleLevel.SUPER_ADMIN) {
            return false;
        }
        return actorLevel.ordinal() >= targetLevel.ordinal();
    }

    public boolean canRemoveGlobalRole(Usuario actor, Usuario objetivo, Rol targetRole) {
        RoleLevel actorLevel = highestGlobalRole(actor);
        RoleLevel targetLevel = roleLevelFromRol(targetRole);
        if (actorLevel == null) {
            return false;
        }
        if (targetLevel == null) {
            return isSuperAdmin(actor);
        }
        if (targetLevel == RoleLevel.SUPER_ADMIN && actorLevel != RoleLevel.SUPER_ADMIN) {
            return false;
        }
        if (targetLevel == RoleLevel.ADMIN_EMPRESA) {
            return true;
        }
        return actorLevel.ordinal() >= targetLevel.ordinal();
    }

    public boolean canManageEmpresa(Usuario actor, Empresa empresa) {
        if (isSuperAdmin(actor)) {
            return true;
        }
        RoleLevel effective = effectiveRoleForEmpresa(actor, empresa);
        if (effective == null) {
            return false;
        }
        return effective.ordinal() >= RoleLevel.ADMIN_EMPRESA.ordinal();
    }

    public boolean canAssignEmpresaRole(Usuario actor, Empresa empresa, Rol targetRole) {
        if (isSuperAdmin(actor)) {
            return true;
        }
        RoleLevel effective = effectiveRoleForEmpresa(actor, empresa);
        RoleLevel targetLevel = roleLevelFromRol(targetRole);
        if (effective == null || targetLevel == null) {
            return false;
        }
        if (targetLevel == RoleLevel.SUPER_ADMIN) {
            return false;
        }
        return effective.ordinal() >= targetLevel.ordinal();
    }

    public boolean canManageAlmacen(Usuario actor, Almacen almacen) {
        if (isSuperAdmin(actor)) {
            return true;
        }
        Empresa empresa = almacen.getEmpresa();
        RoleLevel empresaEffective = effectiveRoleForEmpresa(actor, empresa);
        if (empresaEffective != null && empresaEffective.ordinal() >= RoleLevel.ADMIN_EMPRESA.ordinal()) {
            return true;
        }
        RoleLevel almacenEffective = effectiveRoleForAlmacen(actor, almacen);
        if (almacenEffective == null) {
            return false;
        }
        return almacenEffective.ordinal() >= RoleLevel.ADMIN_ALMACEN.ordinal();
    }

    public boolean isLastAdminEmpresa(Empresa empresa, Usuario usuario) {
        List<EmpresaUsuario> relacionesUsuario = empresaUsuarioRepository.findAllByEmpresaAndUsuario(empresa, usuario);
        boolean usuarioEsAdmin = relacionesUsuario.stream()
                .anyMatch(rel -> rel != null && roleLevelFromRol(rel.getRol()) == RoleLevel.ADMIN_EMPRESA);
        if (!usuarioEsAdmin) {
            return false;
        }
        long totalAdmins = empresaUsuarioRepository.findByEmpresa(empresa).stream()
                .filter(rel -> rel != null
                        && rel.getUsuario() != null
                        && roleLevelFromRol(rel.getRol()) == RoleLevel.ADMIN_EMPRESA)
                .map(rel -> rel.getUsuario().getId())
                .filter(id -> id != null)
                .distinct()
                .count();
        return totalAdmins <= 1;
    }

    @Transactional
    public void removeEmpresaUsuarioAndAlmacenAccesos(Empresa empresa, Usuario usuario) {
        List<Almacen> almacenes = almacenRepository.findByEmpresa(empresa);
        for (Almacen almacen : almacenes) {
            almacenUsuarioRepository.deleteByAlmacenAndUsuario(almacen, usuario);
        }
        empresaUsuarioRepository.deleteByEmpresaAndUsuario(empresa, usuario);
    }

    private RoleLevel maxLevel(RoleLevel a, RoleLevel b) {
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return a.ordinal() >= b.ordinal() ? a : b;
    }
}
