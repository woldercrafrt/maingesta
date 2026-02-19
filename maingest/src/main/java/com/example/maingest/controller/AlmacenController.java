package com.example.maingest.controller;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.Item;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.AlmacenRepository;
import com.example.maingest.repository.AlmacenUsuarioRepository;
import com.example.maingest.repository.ArmarioRepository;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.EmpresaUsuarioRepository;
import com.example.maingest.repository.ItemRepository;
import com.example.maingest.repository.RepisaRepository;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.PermissionService;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.AlmacenUsuario;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/almacenes")
public class AlmacenController {

    private static final double ARMARIO_DISPLAY_ANCHO = 0.12;
    private static final double ARMARIO_DISPLAY_ALTO = 0.18;

    private final AlmacenRepository almacenRepository;
    private final EmpresaRepository empresaRepository;
    private final ArmarioRepository armarioRepository;
    private final RepisaRepository repisaRepository;
    private final ItemRepository itemRepository;
    private final AlmacenUsuarioRepository almacenUsuarioRepository;
    private final EmpresaUsuarioRepository empresaUsuarioRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;

    public AlmacenController(
            AlmacenRepository almacenRepository,
            EmpresaRepository empresaRepository,
            ArmarioRepository armarioRepository,
            RepisaRepository repisaRepository,
            ItemRepository itemRepository,
            AlmacenUsuarioRepository almacenUsuarioRepository,
            EmpresaUsuarioRepository empresaUsuarioRepository,
            AccessControlService accessControlService,
            PermissionService permissionService
    ) {
        this.almacenRepository = almacenRepository;
        this.empresaRepository = empresaRepository;
        this.armarioRepository = armarioRepository;
        this.repisaRepository = repisaRepository;
        this.itemRepository = itemRepository;
        this.almacenUsuarioRepository = almacenUsuarioRepository;
        this.empresaUsuarioRepository = empresaUsuarioRepository;
        this.accessControlService = accessControlService;
        this.permissionService = permissionService;
    }

    public record AlmacenDto(
            Long id,
            String nombre,
            Long empresaId,
            String empresaNombre,
            String estilos
    ) {
    }

    public record AlmacenCreateDto(
            String nombre,
            Long empresaId,
            String estilos
    ) {
    }

    public record AlmacenUpdateDto(
            String nombre,
            String estilos
    ) {
    }

    public record RepisaDto(
            Long id,
            Integer nivel,
            Integer capacidad,
            Long itemsOcupados
    ) {
    }

    public record ArmarioDto(
            Long id,
            String nombre,
            Integer tamanioTotal,
            Double posX,
            Double posY,
            Double ancho,
            Double alto,
            Double rotacion,
            List<RepisaDto> repisas
    ) {
    }

    public record AlmacenEstructuraDto(
            Long id,
            String nombre,
            Long empresaId,
            String empresaNombre,
            String estilos,
            List<ArmarioDto> armarios
    ) {
    }

    public record ArmarioCreateDto(
            String nombre,
            Integer tamanioTotal,
            Double posX,
            Double posY,
            Double ancho,
            Double alto,
            Double rotacion
    ) {
    }

    public record ArmarioPosicionDto(
            Double posX,
            Double posY,
            Double ancho,
            Double alto,
            Double rotacion
    ) {
    }

    public record RepisaCreateDto(
            Integer nivel,
            Integer capacidad
    ) {
    }

    public record RepisaGlobalDto(
            Long empresaId,
            String empresaNombre,
            Long almacenId,
            String almacenNombre,
            Long armarioId,
            String armarioNombre,
            Long repisaId,
            Integer repisaNivel,
            Integer repisaCapacidad,
            Long itemsOcupados
    ) {
    }

    @GetMapping
    public ResponseEntity<List<AlmacenDto>> listar() {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        boolean isSuperAdmin = accessControlService.isSuperAdmin(actor);
        List<AlmacenDto> filas = almacenRepository.findAll().stream()
                .filter(almacen -> isSuperAdmin || permissionService.hasPermissionForAlmacen(actor, almacen, "ALMACEN", 1))
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(filas);
    }

    @PostMapping
    public ResponseEntity<AlmacenDto> crear(@RequestBody AlmacenCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto.empresaId() == null || dto.nombre() == null || dto.nombre().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Empresa empresa = empresaRepository.findById(dto.empresaId()).orElse(null);
        if (empresa == null) {
            return ResponseEntity.badRequest().build();
        }
        if (!accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForEmpresa(actor, empresa, "ALMACEN", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Almacen almacen = new Almacen();
        almacen.setNombre(dto.nombre().trim());
        almacen.setEmpresa(empresa);
        if (dto.estilos() != null) {
            almacen.setEstilos(dto.estilos());
        }
        Almacen guardado = almacenRepository.save(almacen);
        AlmacenDto respuesta = toDto(guardado);
        return ResponseEntity.created(URI.create("/api/almacenes/" + guardado.getId())).body(respuesta);
    }

    /**
     * @param almacenId
     * @param dto
     * @return
     */
    @PatchMapping("/{almacenId}")
    public ResponseEntity<AlmacenDto> actualizar(@PathVariable("almacenId") Long almacenId, @RequestBody AlmacenUpdateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Almacen almacen = almacenRepository.findById(almacenId).orElse(null);
        if (almacen == null) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = almacen.getEmpresa();
        if (empresa == null) {
            return ResponseEntity.badRequest().build();
        }
        if (!accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForEmpresa(actor, empresa, "ALMACEN", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto.nombre() != null) {
            String nombre = dto.nombre().trim();
            if (nombre.isBlank()) {
                return ResponseEntity.badRequest().build();
            }
            almacen.setNombre(nombre);
        }
        if (dto.estilos() != null) {
            almacen.setEstilos(dto.estilos());
        }
        Almacen guardado = almacenRepository.save(almacen);
        return ResponseEntity.ok(toDto(guardado));
    }

    @DeleteMapping("/{almacenId}")
    @Transactional
    public ResponseEntity<Void> eliminar(@PathVariable("almacenId") Long almacenId) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Almacen almacen = almacenRepository.findById(almacenId).orElse(null);
        if (almacen == null) {
            return ResponseEntity.notFound().build();
        }
        Empresa empresa = almacen.getEmpresa();
        if (empresa == null) {
            return ResponseEntity.badRequest().build();
        }
        if (!accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForEmpresa(actor, empresa, "ALMACEN", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{almacenId}/estructura")
    public ResponseEntity<AlmacenEstructuraDto> obtenerEstructura(@PathVariable("almacenId") Long almacenId) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Almacen almacen = almacenRepository.findById(almacenId).orElse(null);
        if (almacen == null) {
            return ResponseEntity.notFound().build();
        }
        if (!accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForAlmacen(actor, almacen, "ALMACEN", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Empresa empresa = almacen.getEmpresa();
        List<Armario> armarios = armarioRepository.findByAlmacen(almacen);
        List<ArmarioDto> armariosDto = armarios.stream()
                .map(armario -> {
                    List<Repisa> repisas = repisaRepository.findByArmario(armario);
                    List<RepisaDto> repisasDto = repisas.stream()
                            .map(repisa -> {
                                long itemsCount = itemRepository.findByRepisa(repisa).size();
                                return new RepisaDto(
                                        repisa.getId(),
                                        repisa.getNivel(),
                                        repisa.getCapacidad(),
                                        itemsCount
                                );
                            })
                            .toList();
                    return new ArmarioDto(
                            armario.getId(),
                            armario.getNombre(),
                            armario.getTamanioTotal(),
                            armario.getPosX(),
                            armario.getPosY(),
                            armario.getAncho(),
                            armario.getAlto(),
                            armario.getRotacion(),
                            repisasDto
                    );
                })
                .toList();
        AlmacenEstructuraDto respuesta = new AlmacenEstructuraDto(
                almacen.getId(),
                almacen.getNombre(),
                empresa != null ? empresa.getId() : null,
                empresa != null ? empresa.getNombre() : null,
                almacen.getEstilos(),
                armariosDto
        );
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/estructura-global")
    public ResponseEntity<List<RepisaGlobalDto>> obtenerEstructuraGlobal() {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean isSuperAdmin = accessControlService.isSuperAdmin(actor);
        Set<Long> empresasPermitidas = new HashSet<>();
        Set<Long> almacenesPermitidos = new HashSet<>();

        if (!isSuperAdmin) {
            List<EmpresaUsuario> empresas = empresaUsuarioRepository.findByUsuario(actor);
            for (EmpresaUsuario relacion : empresas) {
                Empresa empresa = relacion.getEmpresa();
                if (empresa != null && empresa.getId() != null) {
                    empresasPermitidas.add(empresa.getId());
                }
            }
            List<AlmacenUsuario> almacenes = almacenUsuarioRepository.findByUsuario(actor);
            for (AlmacenUsuario relacion : almacenes) {
                Almacen almacen = relacion.getAlmacen();
                if (almacen != null && almacen.getId() != null) {
                    almacenesPermitidos.add(almacen.getId());
                }
            }
        }

        List<Almacen> todosAlmacenes = almacenRepository.findAll();
        List<RepisaGlobalDto> resultado = new ArrayList<>();

        for (Almacen almacen : todosAlmacenes) {
            Empresa empresa = almacen.getEmpresa();
            boolean permitido = false;

            if (isSuperAdmin) {
                permitido = true;
            } else {
                if (almacenesPermitidos.contains(almacen.getId())) {
                    permitido = true;
                } else if (empresa != null && empresa.getId() != null && empresasPermitidas.contains(empresa.getId())) {
                    permitido = true;
                }
            }

            if (!permitido) {
                continue;
            }

            List<Armario> armarios = armarioRepository.findByAlmacen(almacen);
            for (Armario armario : armarios) {
                List<Repisa> repisas = repisaRepository.findByArmario(armario);
                for (Repisa repisa : repisas) {
                    long itemsCount = itemRepository.findByRepisa(repisa).size();
                    resultado.add(new RepisaGlobalDto(
                            empresa != null ? empresa.getId() : null,
                            empresa != null ? empresa.getNombre() : null,
                            almacen.getId(),
                            almacen.getNombre(),
                            armario.getId(),
                            armario.getNombre(),
                            repisa.getId(),
                            repisa.getNivel(),
                            repisa.getCapacidad(),
                            itemsCount
                    ));
                }
                // Si el armario no tiene repisas, podríamos querer mostrarlo también,
                // pero la DTO está centrada en repisas. Si se requiere mostrar armarios vacíos,
                // se podría agregar una entrada con repisaId = null o similar.
                // Por ahora, asumimos que "Armarios y repisas" se enfoca en repisas disponibles.
                if (repisas.isEmpty()) {
                     resultado.add(new RepisaGlobalDto(
                            empresa != null ? empresa.getId() : null,
                            empresa != null ? empresa.getNombre() : null,
                            almacen.getId(),
                            almacen.getNombre(),
                            armario.getId(),
                            armario.getNombre(),
                            null,
                            null,
                            null,
                            0L
                    ));
                }
            }
        }

        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/armarios/{armarioId}")
    public ResponseEntity<ArmarioDto> obtenerArmario(@PathVariable("armarioId") Long armarioId) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Armario armario = armarioRepository.findById(armarioId).orElse(null);
        if (armario == null) {
            return ResponseEntity.notFound().build();
        }
        Almacen almacen = armario.getAlmacen();
        if (almacen != null && !accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForAlmacen(actor, almacen, "ARMARIO", 1)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<RepisaDto> repisasDto = repisaRepository.findByArmario(armario).stream()
                .map(repisa -> {
                    long itemsCount = itemRepository.findByRepisa(repisa).size();
                    return new RepisaDto(
                            repisa.getId(),
                            repisa.getNivel(),
                            repisa.getCapacidad(),
                            itemsCount
                    );
                })
                .toList();

        ArmarioDto respuesta = new ArmarioDto(
                armario.getId(),
                armario.getNombre(),
                armario.getTamanioTotal(),
                armario.getPosX(),
                armario.getPosY(),
                armario.getAncho(),
                armario.getAlto(),
                armario.getRotacion(),
                repisasDto
        );
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/{almacenId}/armarios")
    public ResponseEntity<ArmarioDto> crearArmario(
            @PathVariable("almacenId") Long almacenId,
            @RequestBody ArmarioCreateDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Almacen almacen = almacenRepository.findById(almacenId).orElse(null);
        if (almacen == null) {
            return ResponseEntity.notFound().build();
        }
        if (!accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForAlmacen(actor, almacen, "ARMARIO", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto.nombre() == null || dto.nombre().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Armario armario = new Armario();
        armario.setNombre(dto.nombre().trim());
        armario.setTamanioTotal(dto.tamanioTotal() != null ? dto.tamanioTotal() : 100);
        armario.setPosX(clampNormalizedOrNull(dto.posX(), 0.06));
        armario.setPosY(clampNormalizedOrNull(dto.posY(), 0.12));
        armario.setAncho(clampSizeOrNull(dto.ancho(), 0.12));
        armario.setAlto(clampSizeOrNull(dto.alto(), 0.6));
        armario.setRotacion(dto.rotacion() != null ? dto.rotacion() : 0.0);
        armario.setAlmacen(almacen);
        Armario guardado = armarioRepository.save(armario);
        ArmarioDto respuesta = new ArmarioDto(
                guardado.getId(),
                guardado.getNombre(),
                guardado.getTamanioTotal(),
                guardado.getPosX(),
                guardado.getPosY(),
                guardado.getAncho(),
                guardado.getAlto(),
                guardado.getRotacion(),
                List.of()
        );
        return ResponseEntity.created(URI.create("/api/almacenes/" + almacenId + "/armarios/" + guardado.getId()))
                .body(respuesta);
    }

    @PatchMapping("/armarios/{armarioId}/posicion")
    public ResponseEntity<ArmarioDto> actualizarPosicionArmario(
            @PathVariable("armarioId") Long armarioId,
            @RequestBody ArmarioPosicionDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Armario armario = armarioRepository.findById(armarioId).orElse(null);
        if (armario == null) {
            return ResponseEntity.notFound().build();
        }
        Almacen almacen = armario.getAlmacen();
        if (almacen != null && !accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForAlmacen(actor, almacen, "ARMARIO", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Double ancho = clampSizeOrNull(dto.ancho(), armario.getAncho() != null ? armario.getAncho() : 0.12);
        Double alto = clampSizeOrNull(dto.alto(), armario.getAlto() != null ? armario.getAlto() : 0.6);
        Double posX = clampNormalizedOrNull(dto.posX(), armario.getPosX() != null ? armario.getPosX() : 0.06);
        Double posY = clampNormalizedOrNull(dto.posY(), armario.getPosY() != null ? armario.getPosY() : 0.12);
        Double rotacion = dto.rotacion() != null ? dto.rotacion() : (armario.getRotacion() != null ? armario.getRotacion() : 0.0);

        posX = clampNormalizedOrNull(posX, 0.0);
        posY = clampNormalizedOrNull(posY, 0.0);

        double clampAncho = ARMARIO_DISPLAY_ANCHO;
        double clampAlto = ARMARIO_DISPLAY_ALTO;
        if (posX != null && posX + clampAncho > 1.0) {
            posX = 1.0 - clampAncho;
        }
        if (posY != null && posY + clampAlto > 1.0) {
            posY = 1.0 - clampAlto;
        }

        armario.setPosX(posX);
        armario.setPosY(posY);
        armario.setAncho(ancho);
        armario.setAlto(alto);
        armario.setRotacion(rotacion);
        Armario guardado = armarioRepository.save(armario);

        List<RepisaDto> repisasDto = repisaRepository.findByArmario(guardado).stream()
                .map(repisa -> {
                    long itemsCount = itemRepository.findByRepisa(repisa).size();
                    return new RepisaDto(
                            repisa.getId(),
                            repisa.getNivel(),
                            repisa.getCapacidad(),
                            itemsCount
                    );
                })
                .toList();

        ArmarioDto respuesta = new ArmarioDto(
                guardado.getId(),
                guardado.getNombre(),
                guardado.getTamanioTotal(),
                guardado.getPosX(),
                guardado.getPosY(),
                guardado.getAncho(),
                guardado.getAlto(),
                guardado.getRotacion(),
                repisasDto
        );
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/armarios/{armarioId}/repisas")
    public ResponseEntity<RepisaDto> crearRepisa(
            @PathVariable("armarioId") Long armarioId,
            @RequestBody RepisaCreateDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Armario armario = armarioRepository.findById(armarioId).orElse(null);
        if (armario == null) {
            return ResponseEntity.notFound().build();
        }
        Almacen almacen = armario.getAlmacen();
        if (almacen != null && !accessControlService.isSuperAdmin(actor) && !permissionService.hasPermissionForAlmacen(actor, almacen, "REPISA", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto.nivel() == null || dto.nivel() <= 0 || dto.capacidad() == null || dto.capacidad() <= 0) {
            return ResponseEntity.badRequest().build();
        }
        Repisa repisa = new Repisa();
        repisa.setNivel(dto.nivel());
        repisa.setCapacidad(dto.capacidad());
        repisa.setArmario(armario);
        Repisa guardada = repisaRepository.save(repisa);
        RepisaDto respuesta = new RepisaDto(
                guardada.getId(),
                guardada.getNivel(),
                guardada.getCapacidad(),
                0L
        );
        return ResponseEntity.created(URI.create("/api/almacenes/armarios/" + armarioId + "/repisas/" + guardada.getId()))
                .body(respuesta);
    }

    private AlmacenDto toDto(Almacen almacen) {
        Empresa empresa = almacen.getEmpresa();
        Long empresaId = empresa != null ? empresa.getId() : null;
        String empresaNombre = empresa != null ? empresa.getNombre() : null;
        return new AlmacenDto(
                almacen.getId(),
                almacen.getNombre(),
                empresaId,
                empresaNombre,
                almacen.getEstilos()
        );
    }

    private static Double clampNormalizedOrNull(Double value, Double fallback) {
        if (value == null) {
            return fallback;
        }
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return fallback;
        }
        if (value < 0.0) {
            return 0.0;
        }
        if (value > 1.0) {
            return 1.0;
        }
        return value;
    }

    private static Double clampSizeOrNull(Double value, Double fallback) {
        Double normalized = clampNormalizedOrNull(value, fallback);
        if (normalized == null) {
            return null;
        }
        if (normalized < 0.01) {
            return 0.01;
        }
        return normalized;
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
