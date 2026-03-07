package com.example.maingest.service;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EstadoStock;
import com.example.maingest.domain.Item;
import com.example.maingest.domain.Producto;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.UnidadMedida;
import com.example.maingest.repository.ItemRepository;
import com.example.maingest.repository.ProductoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Order(100)
public class DataMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataMigrationRunner.class);

    private final ItemRepository itemRepository;
    private final ProductoRepository productoRepository;

    public DataMigrationRunner(
            ItemRepository itemRepository,
            ProductoRepository productoRepository
    ) {
        this.itemRepository = itemRepository;
        this.productoRepository = productoRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        List<Item> itemsSinProducto = itemRepository.findAll().stream()
                .filter(item -> item.getProducto() == null && item.getNombre() != null && !item.getNombre().isBlank())
                .toList();

        if (itemsSinProducto.isEmpty()) {
            log.info("Migración Item→Producto: No hay items sin producto asignado. Nada que migrar.");
            return;
        }

        log.info("Migración Item→Producto: Encontrados {} items sin producto asignado. Iniciando migración...", itemsSinProducto.size());

        // Agrupar items por empresa y nombre para crear productos únicos
        Map<String, Producto> productoCache = new HashMap<>();
        int migrados = 0;

        for (Item item : itemsSinProducto) {
            Empresa empresa = resolveEmpresa(item);
            if (empresa == null) {
                log.warn("Migración: Item id={} no tiene empresa resoluble. Saltando.", item.getId());
                continue;
            }

            String nombreNormalizado = item.getNombre().trim().toLowerCase();
            String cacheKey = empresa.getId() + "::" + nombreNormalizado;

            Producto producto = productoCache.get(cacheKey);
            if (producto == null) {
                // Buscar si ya existe un producto con ese nombre en la empresa
                producto = productoRepository.findByEmpresa(empresa).stream()
                        .filter(p -> p.getNombre() != null && p.getNombre().trim().toLowerCase().equals(nombreNormalizado))
                        .findFirst()
                        .orElse(null);

                if (producto == null) {
                    producto = new Producto();
                    producto.setEmpresa(empresa);
                    producto.setNombre(item.getNombre().trim());
                    producto.setSku(generarSku(empresa));
                    producto.setUnidadMedida(UnidadMedida.UNIDAD);
                    if (item.getPrecio() != null) {
                        producto.setPrecioBase(item.getPrecio());
                    }
                    producto = productoRepository.save(producto);
                    log.info("Migración: Producto creado - SKU={} nombre='{}' empresa={}", producto.getSku(), producto.getNombre(), empresa.getId());
                }
                productoCache.put(cacheKey, producto);
            }

            item.setProducto(producto);
            item.setCantidad(1);
            item.setEstadoStock(EstadoStock.DISPONIBLE);
            itemRepository.save(item);
            migrados++;
        }

        log.info("Migración Item→Producto: Completada. {} items migrados, {} productos creados.",
                migrados, productoCache.values().stream().distinct().count());
    }

    private Empresa resolveEmpresa(Item item) {
        Repisa repisa = item.getRepisa();
        if (repisa == null) return null;
        Armario armario = repisa.getArmario();
        if (armario == null) return null;
        Almacen almacen = armario.getAlmacen();
        if (almacen == null) return null;
        return almacen.getEmpresa();
    }

    private String generarSku(Empresa empresa) {
        int maxNum = 0;
        try {
            maxNum = productoRepository.findMaxSkuNumber(empresa.getId());
        } catch (Exception ignored) {
        }
        return String.format("PRD-%04d", maxNum + 1);
    }
}
