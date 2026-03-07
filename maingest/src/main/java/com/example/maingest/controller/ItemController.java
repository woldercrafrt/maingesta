package com.example.maingest.controller;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.Item;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.EmpresaRepository;
import com.example.maingest.repository.ItemRepository;
import com.example.maingest.repository.RepisaRepository;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.PermissionService;
import com.example.maingest.service.SuscripcionValidationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemRepository itemRepository;
    private final RepisaRepository repisaRepository;
    private final EmpresaRepository empresaRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;
    private final SuscripcionValidationService suscripcionValidationService;

    public ItemController(
            ItemRepository itemRepository,
            RepisaRepository repisaRepository,
            EmpresaRepository empresaRepository,
            AccessControlService accessControlService,
            PermissionService permissionService,
            SuscripcionValidationService suscripcionValidationService
    ) {
        this.itemRepository = itemRepository;
        this.repisaRepository = repisaRepository;
        this.empresaRepository = empresaRepository;
        this.accessControlService = accessControlService;
        this.permissionService = permissionService;
        this.suscripcionValidationService = suscripcionValidationService;
    }

    public record ItemDto(
            Long id,
            String nombre,
            String estado,
            Integer tamanio,
            BigDecimal precio,
            Long repisaId,
            Long armarioId,
            Long almacenId,
            Long empresaId
    ) {
    }

    public record ItemCreateDto(
            Long repisaId,
            String nombre,
            String estado,
            Integer tamanio,
            BigDecimal precio
    ) {
    }

    public record ItemPrecioPatchDto(
            BigDecimal precio
    ) {
    }

    @GetMapping
    public ResponseEntity<List<ItemDto>> listar(@RequestParam(value = "empresaId", required = false) Long empresaId) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Empresa empresaFiltro = null;
        if (empresaId != null) {
            empresaFiltro = empresaRepository.findById(empresaId).orElse(null);
            if (empresaFiltro == null) {
                return ResponseEntity.notFound().build();
            }
            if (!accessControlService.isSuperAdmin(actor)
                    && !permissionService.hasPermissionForEmpresa(actor, empresaFiltro, "ITEM", 1)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        } else {
            if (!permissionService.hasPermission(actor, "ITEM", 1)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Empresa finalEmpresaFiltro = empresaFiltro;
        List<ItemDto> respuesta = itemRepository.findAll().stream()
                .map(this::toItemDto)
                .filter(dto -> {
                    if (finalEmpresaFiltro == null) {
                        return true;
                    }
                    return Objects.equals(dto.empresaId(), finalEmpresaFiltro.getId());
                })
                .toList();

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping
    public ResponseEntity<ItemDto> crear(@RequestBody ItemCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto == null || dto.repisaId() == null || dto.nombre() == null || dto.nombre().isBlank()
                || dto.estado() == null || dto.estado().isBlank() || dto.tamanio() == null) {
            return ResponseEntity.badRequest().build();
        }

        Repisa repisa = repisaRepository.findById(dto.repisaId()).orElse(null);
        if (repisa == null) {
            return ResponseEntity.badRequest().build();
        }

        Armario armario = repisa.getArmario();
        Almacen almacen = armario != null ? armario.getAlmacen() : null;
        Empresa empresa = almacen != null ? almacen.getEmpresa() : null;
        if (empresa == null) {
            return ResponseEntity.badRequest().build();
        }

        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "ITEM", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (!accessControlService.isSuperAdmin(actor)) {
            SuscripcionValidationService.ValidationResult validation = suscripcionValidationService.validateCanCreateItem(empresa);
            if (!validation.isValid()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
        }

        Item item = new Item();
        item.setRepisa(repisa);
        item.setNombre(dto.nombre().trim());
        item.setEstado(dto.estado().trim());
        item.setTamanio(dto.tamanio());
        item.setPrecio(dto.precio());

        Item guardado = itemRepository.save(item);
        ItemDto respuesta = toItemDto(guardado);
        return ResponseEntity.created(URI.create("/api/items/" + guardado.getId())).body(respuesta);
    }

    @PatchMapping("/{id}/precio")
    public ResponseEntity<ItemDto> actualizarPrecio(
            @PathVariable("id") Long id,
            @RequestBody ItemPrecioPatchDto dto
    ) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Item> itemOpt = itemRepository.findById(id);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Item item = itemOpt.get();
        Repisa repisa = item.getRepisa();
        Armario armario = repisa != null ? repisa.getArmario() : null;
        Almacen almacen = armario != null ? armario.getAlmacen() : null;
        Empresa empresa = almacen != null ? almacen.getEmpresa() : null;
        if (empresa == null) {
            return ResponseEntity.badRequest().build();
        }

        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForEmpresa(actor, empresa, "ITEM", 3)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        BigDecimal precio = dto != null ? dto.precio() : null;
        item.setPrecio(precio);
        Item guardado = itemRepository.save(item);
        return ResponseEntity.ok(toItemDto(guardado));
    }

    private ItemDto toItemDto(Item item) {
        Repisa repisa = item != null ? item.getRepisa() : null;
        Armario armario = repisa != null ? repisa.getArmario() : null;
        Almacen almacen = armario != null ? armario.getAlmacen() : null;
        Empresa empresa = almacen != null ? almacen.getEmpresa() : null;
        return new ItemDto(
                item != null ? item.getId() : null,
                item != null ? item.getNombre() : null,
                item != null ? item.getEstado() : null,
                item != null ? item.getTamanio() : null,
                item != null ? item.getPrecio() : null,
                repisa != null ? repisa.getId() : null,
                armario != null ? armario.getId() : null,
                almacen != null ? almacen.getId() : null,
                empresa != null ? empresa.getId() : null
        );
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
