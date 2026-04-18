package com.example.maingest.controller;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.AlmacenUsuario;
import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.EmpresaUsuarioId;
import com.example.maingest.domain.Item;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.Rol;
import com.example.maingest.domain.RolPermiso;
import com.example.maingest.domain.Usuario;
import com.example.maingest.domain.UsuarioRol;
import com.example.maingest.repository.AlmacenRepository;
import com.example.maingest.repository.AlmacenUsuarioRepository;
import com.example.maingest.repository.ArmarioRepository;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaSuscripcionRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.ItemRepository;
import com.example.maingest.repository.MovimientoInventarioRepository;
import com.example.maingest.repository.PagoWompiRepository;
import com.example.maingest.repository.ProductoRepository;
import com.example.maingest.repository.RepisaRepository;
import com.example.maingest.repository.RolPermisoRepository;
import com.example.maingest.repository.RolRepository;
import com.example.maingest.repository.UsuarioRepository;
import com.example.maingest.repository.UsuarioRolRepository;
import com.example.maingest.service.AccessControlService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminDeleteController {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final EmpresaRepository empresaRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final AlmacenUsuarioRepository almacenUsuarioRepository;
    private final RolRepository rolRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final MovimientoInventarioRepository movimientoInventarioRepository;
    private final ProductoRepository productoRepository;
    private final AlmacenRepository almacenRepository;
    private final ArmarioRepository armarioRepository;
    private final RepisaRepository repisaRepository;
    private final ItemRepository itemRepository;
    private final EmpresaSuscripcionRepository empresaSuscripcionRepository;
    private final PagoWompiRepository pagoWompiRepository;
    private final AccessControlService accessControlService;

    public AdminDeleteController(
            UsuarioRepository usuarioRepository,
            UsuarioRolRepository usuarioRolRepository,
            EmpresaRepository empresaRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            AlmacenUsuarioRepository almacenUsuarioRepository,
            RolRepository rolRepository,
            RolPermisoRepository rolPermisoRepository,
            MovimientoInventarioRepository movimientoInventarioRepository,
            ProductoRepository productoRepository,
            AlmacenRepository almacenRepository,
            ArmarioRepository armarioRepository,
            RepisaRepository repisaRepository,
            ItemRepository itemRepository,
            EmpresaSuscripcionRepository empresaSuscripcionRepository,
            PagoWompiRepository pagoWompiRepository,
            AccessControlService accessControlService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.empresaRepository = empresaRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.almacenUsuarioRepository = almacenUsuarioRepository;
        this.rolRepository = rolRepository;
        this.rolPermisoRepository = rolPermisoRepository;
        this.movimientoInventarioRepository = movimientoInventarioRepository;
        this.productoRepository = productoRepository;
        this.almacenRepository = almacenRepository;
        this.armarioRepository = armarioRepository;
        this.repisaRepository = repisaRepository;
        this.itemRepository = itemRepository;
        this.empresaSuscripcionRepository = empresaSuscripcionRepository;
        this.pagoWompiRepository = pagoWompiRepository;
        this.accessControlService = accessControlService;
    }

    public record UsuarioDeletePreview(
            Long usuarioId,
            long movimientos,
            long rolesGlobales,
            long empresas,
            long almacenes,
            boolean lastAdminEmpresa,
            Long empresaId
    ) {
    }

    public record UsuarioDeleteRequest(
            String movimientosStrategy,
            Long movimientosNuevoUsuarioId,
            Boolean forceLastAdmin
    ) {
    }

    public record EmpresaDeletePreview(
            Long empresaId,
            long almacenes,
            long armarios,
            long repisas,
            long items,
            long productos,
            long movimientos,
            long usuarios,
            long roles,
            long suscripciones,
            long pagosWompi
    ) {
    }

    public record EmpresaDeleteRequest(
            String usuariosStrategy,
            Long nuevoEmpresaId,
            Long nuevoRolId
    ) {
    }

    @GetMapping("/usuarios/{id}/delete-preview")
    public ResponseEntity<UsuarioDeletePreview> usuarioDeletePreview(@PathVariable("id") Long id) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();

        long movimientos = movimientoInventarioRepository.countByUsuarioId(id);
        long rolesGlobales = usuarioRolRepository.findByUsuario(usuario).size();
        long empresas = empresaUsuarioRepository.findByUsuario(usuario).size();
        long almacenes = almacenUsuarioRepository.findByUsuario(usuario).size();

        EmpresaUsuario relacion = empresaUsuarioRepository.findByUsuario(usuario).stream().findFirst().orElse(null);
        Empresa empresa = relacion != null ? relacion.getEmpresa() : null;
        boolean lastAdmin = empresa != null && accessControlService.isLastAdminEmpresa(empresa, usuario);
        Long empresaId = empresa != null ? empresa.getId() : null;

        return ResponseEntity.ok(new UsuarioDeletePreview(id, movimientos, rolesGlobales, empresas, almacenes, lastAdmin, empresaId));
    }

    @PostMapping("/usuarios/{id}/delete")
    @Transactional
    public ResponseEntity<Void> deleteUsuario(
            @PathVariable("id") Long id,
            @RequestBody UsuarioDeleteRequest request
    ) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Usuario usuario = usuarioOpt.get();

        EmpresaUsuario relacion = empresaUsuarioRepository.findByUsuario(usuario).stream().findFirst().orElse(null);
        Empresa empresa = relacion != null ? relacion.getEmpresa() : null;
        boolean lastAdmin = empresa != null && accessControlService.isLastAdminEmpresa(empresa, usuario);
        if (lastAdmin && !Boolean.TRUE.equals(request.forceLastAdmin())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        long movimientos = movimientoInventarioRepository.countByUsuarioId(id);
        if (movimientos > 0) {
            String strategy = request.movimientosStrategy() != null ? request.movimientosStrategy().trim().toUpperCase() : "";
            if ("DELETE".equals(strategy)) {
                movimientoInventarioRepository.deleteByUsuario(usuario);
            } else if ("REASSIGN".equals(strategy)) {
                if (request.movimientosNuevoUsuarioId() == null) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
                if (Objects.equals(request.movimientosNuevoUsuarioId(), id)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
                Optional<Usuario> nuevoUsuarioOpt = usuarioRepository.findById(request.movimientosNuevoUsuarioId());
                if (nuevoUsuarioOpt.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
                movimientoInventarioRepository.reasignarUsuario(id, nuevoUsuarioOpt.get());
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
        }

        List<UsuarioRol> roles = usuarioRolRepository.findByUsuario(usuario);
        if (!roles.isEmpty()) {
            usuarioRolRepository.deleteAll(roles);
        }

        List<EmpresaUsuario> empresas = empresaUsuarioRepository.findByUsuario(usuario);
        if (!empresas.isEmpty()) {
            empresaUsuarioRepository.deleteAll(empresas);
        }

        List<AlmacenUsuario> almacenes = almacenUsuarioRepository.findByUsuario(usuario);
        if (!almacenes.isEmpty()) {
            almacenUsuarioRepository.deleteAll(almacenes);
        }

        usuarioRepository.delete(usuario);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/empresas/{id}/delete-preview")
    public ResponseEntity<EmpresaDeletePreview> empresaDeletePreview(@PathVariable("id") Long id) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();

        long almacenes = almacenRepository.countByEmpresaId(id);
        long armarios = almacenRepository.countArmariosByEmpresaId(id);
        long repisas = almacenRepository.countRepisasByEmpresaId(id);
        long items = almacenRepository.countItemsByEmpresaId(id);
        long productos = productoRepository.countByEmpresaId(id);
        long movimientos = movimientoInventarioRepository.countByEmpresaId(id);
        long usuarios = empresaUsuarioRepository.findByEmpresa(empresa).size();
        long roles = rolRepository.findByEmpresa(empresa).size();
        long suscripciones = empresaSuscripcionRepository.findByEmpresa(empresa).size();
        long pagosWompi = pagoWompiRepository.findByEmpresa(empresa).size();

        return ResponseEntity.ok(new EmpresaDeletePreview(id, almacenes, armarios, repisas, items, productos, movimientos, usuarios, roles, suscripciones, pagosWompi));
    }

    @PostMapping("/empresas/{id}/delete")
    @Transactional
    public ResponseEntity<Void> deleteEmpresa(
            @PathVariable("id") Long id,
            @RequestBody EmpresaDeleteRequest request
    ) {
        Usuario actor = currentUsuario();
        if (actor == null || !accessControlService.isSuperAdmin(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Empresa> empresaOpt = empresaRepository.findById(id);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = empresaOpt.get();

        String usuariosStrategy = request.usuariosStrategy() != null ? request.usuariosStrategy().trim().toUpperCase() : "";

        List<EmpresaUsuario> relacionesEmpresa = empresaUsuarioRepository.findByEmpresa(empresa);
        List<Usuario> usuarios = relacionesEmpresa.stream()
                .map(EmpresaUsuario::getUsuario)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (!usuarios.isEmpty()) {
            if ("MOVE".equals(usuariosStrategy)) {
                if (request.nuevoEmpresaId() == null || Objects.equals(request.nuevoEmpresaId(), id)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
                Optional<Empresa> nuevoEmpresaOpt = empresaRepository.findById(request.nuevoEmpresaId());
                if (nuevoEmpresaOpt.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
                Empresa nuevoEmpresa = nuevoEmpresaOpt.get();

                Rol nuevoRol = null;
                if (request.nuevoRolId() != null) {
                    Optional<Rol> nuevoRolOpt = rolRepository.findById(request.nuevoRolId());
                    if (nuevoRolOpt.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                    }
                    nuevoRol = nuevoRolOpt.get();
                }

                for (Usuario usuario : usuarios) {
                    accessControlService.removeEmpresaUsuarioAndAlmacenAccesos(empresa, usuario);
                    EmpresaUsuarioId euId = new EmpresaUsuarioId(nuevoEmpresa.getId(), usuario.getId());
                    EmpresaUsuario eu = new EmpresaUsuario();
                    eu.setId(euId);
                    eu.setEmpresa(nuevoEmpresa);
                    eu.setUsuario(usuario);
                    eu.setRol(nuevoRol);
                    empresaUsuarioRepository.save(eu);
                }
            } else if ("DETACH".equals(usuariosStrategy)) {
                for (Usuario usuario : usuarios) {
                    accessControlService.removeEmpresaUsuarioAndAlmacenAccesos(empresa, usuario);
                }
            } else if ("DELETE_USERS".equals(usuariosStrategy)) {
                for (Usuario usuario : usuarios) {
                    accessControlService.removeEmpresaUsuarioAndAlmacenAccesos(empresa, usuario);
                }
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
        }

        empresaSuscripcionRepository.deleteAll(empresaSuscripcionRepository.findByEmpresa(empresa));
        pagoWompiRepository.deleteAll(pagoWompiRepository.findByEmpresa(empresa));

        movimientoInventarioRepository.deleteByEmpresa(empresa);

        List<Almacen> almacenes = almacenRepository.findByEmpresa(empresa);
        for (Almacen almacen : almacenes) {
            almacenUsuarioRepository.deleteAll(almacenUsuarioRepository.findByAlmacen(almacen));
            List<Armario> armarios = armarioRepository.findByAlmacen(almacen);
            for (Armario armario : armarios) {
                List<Repisa> repisas = repisaRepository.findByArmario(armario);
                for (Repisa repisa : repisas) {
                    List<Item> items = itemRepository.findByRepisa(repisa);
                    if (!items.isEmpty()) {
                        itemRepository.deleteAll(items);
                    }
                }
                if (!repisas.isEmpty()) {
                    repisaRepository.deleteAll(repisas);
                }
            }
            if (!armarios.isEmpty()) {
                armarioRepository.deleteAll(armarios);
            }
            almacenRepository.delete(almacen);
        }

        productoRepository.deleteAll(productoRepository.findByEmpresa(empresa));

        if (!usuarios.isEmpty() && "DELETE_USERS".equals(usuariosStrategy)) {
            for (Usuario usuario : usuarios) {
                List<UsuarioRol> roles = usuarioRolRepository.findByUsuario(usuario);
                if (!roles.isEmpty()) {
                    usuarioRolRepository.deleteAll(roles);
                }
                List<AlmacenUsuario> almacenesUsuario = almacenUsuarioRepository.findByUsuario(usuario);
                if (!almacenesUsuario.isEmpty()) {
                    almacenUsuarioRepository.deleteAll(almacenesUsuario);
                }
                List<EmpresaUsuario> empresasUsuario = empresaUsuarioRepository.findByUsuario(usuario);
                if (!empresasUsuario.isEmpty()) {
                    empresaUsuarioRepository.deleteAll(empresasUsuario);
                }
                if (movimientoInventarioRepository.countByUsuarioId(usuario.getId()) > 0) {
                    movimientoInventarioRepository.deleteByUsuario(usuario);
                }
                usuarioRepository.delete(usuario);
            }
        }

        List<Rol> rolesEmpresa = rolRepository.findByEmpresa(empresa);
        for (Rol rol : rolesEmpresa) {
            List<UsuarioRol> usuarioRoles = usuarioRolRepository.findByRol(rol);
            if (!usuarioRoles.isEmpty()) {
                usuarioRolRepository.deleteAll(usuarioRoles);
            }
            List<EmpresaUsuario> empresaUsuarios = empresaUsuarioRepository.findByRol(rol);
            if (!empresaUsuarios.isEmpty()) {
                empresaUsuarioRepository.deleteAll(empresaUsuarios);
            }
            List<AlmacenUsuario> almacenUsuarios = almacenUsuarioRepository.findByRol(rol);
            if (!almacenUsuarios.isEmpty()) {
                almacenUsuarioRepository.deleteAll(almacenUsuarios);
            }
            List<RolPermiso> enlaces = rolPermisoRepository.findByRol(rol);
            if (!enlaces.isEmpty()) {
                rolPermisoRepository.deleteAll(enlaces);
            }
            rolRepository.delete(rol);
        }

        List<EmpresaUsuario> relacionesRestantes = empresaUsuarioRepository.findByEmpresa(empresa);
        if (!relacionesRestantes.isEmpty()) {
            empresaUsuarioRepository.deleteAll(relacionesRestantes);
        }

        empresaRepository.delete(empresa);
        return ResponseEntity.noContent().build();
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
