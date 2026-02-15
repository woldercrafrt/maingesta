package com.example.maingest.controller;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Item;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.ItemRepository;
import com.example.maingest.repository.RepisaRepository;
import com.example.maingest.service.AccessControlService;
import com.example.maingest.service.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemRepository itemRepository;
    private final RepisaRepository repisaRepository;
    private final AccessControlService accessControlService;
    private final PermissionService permissionService;

    public ItemController(
            ItemRepository itemRepository,
            RepisaRepository repisaRepository,
            AccessControlService accessControlService,
            PermissionService permissionService
    ) {
        this.itemRepository = itemRepository;
        this.repisaRepository = repisaRepository;
        this.accessControlService = accessControlService;
        this.permissionService = permissionService;
    }

    public record ItemDto(
            Long id,
            String nombre,
            String estado,
            Integer tamanio,
            Long repisaId
    ) {
    }

    public record ItemCreateDto(
            Long repisaId,
            String nombre,
            String estado,
            Integer tamanio
    ) {
    }

    @PostMapping
    public ResponseEntity<ItemDto> crear(@RequestBody ItemCreateDto dto) {
        Usuario actor = currentUsuario();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (dto == null || dto.repisaId() == null) {
            return ResponseEntity.badRequest().build();
        }
        if (dto.nombre() == null || dto.nombre().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (dto.estado() == null || dto.estado().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (dto.tamanio() == null || dto.tamanio() <= 0) {
            return ResponseEntity.badRequest().build();
        }

        Repisa repisa = repisaRepository.findById(dto.repisaId()).orElse(null);
        if (repisa == null) {
            return ResponseEntity.notFound().build();
        }
        Armario armario = repisa.getArmario();
        if (armario == null) {
            return ResponseEntity.badRequest().build();
        }
        Almacen almacen = armario.getAlmacen();
        if (almacen == null) {
            return ResponseEntity.badRequest().build();
        }

        if (!accessControlService.isSuperAdmin(actor)
                && !permissionService.hasPermissionForAlmacen(actor, almacen, "ITEM", 2)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Item item = new Item();
        item.setNombre(dto.nombre().trim());
        item.setEstado(dto.estado().trim());
        item.setTamanio(dto.tamanio());
        item.setRepisa(repisa);

        Item guardado = itemRepository.save(item);

        ItemDto respuesta = new ItemDto(
                guardado.getId(),
                guardado.getNombre(),
                guardado.getEstado(),
                guardado.getTamanio(),
                repisa.getId()
        );

        return ResponseEntity
                .created(URI.create("/api/items/" + guardado.getId()))
                .body(respuesta);
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
