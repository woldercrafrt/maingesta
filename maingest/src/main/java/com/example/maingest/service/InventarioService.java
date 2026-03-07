package com.example.maingest.service;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EstadoStock;
import com.example.maingest.domain.Item;
import com.example.maingest.domain.MovimientoInventario;
import com.example.maingest.domain.Producto;
import com.example.maingest.domain.Repisa;
import com.example.maingest.domain.TipoMovimiento;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.ItemRepository;
import com.example.maingest.repository.MovimientoInventarioRepository;
import com.example.maingest.repository.ProductoRepository;
import com.example.maingest.repository.RepisaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InventarioService {

    private static final Logger log = LoggerFactory.getLogger(InventarioService.class);

    private final ItemRepository itemRepository;
    private final ProductoRepository productoRepository;
    private final RepisaRepository repisaRepository;
    private final MovimientoInventarioRepository movimientoRepository;

    public InventarioService(
            ItemRepository itemRepository,
            ProductoRepository productoRepository,
            RepisaRepository repisaRepository,
            MovimientoInventarioRepository movimientoRepository
    ) {
        this.itemRepository = itemRepository;
        this.productoRepository = productoRepository;
        this.repisaRepository = repisaRepository;
        this.movimientoRepository = movimientoRepository;
    }

    @Transactional(rollbackFor = Exception.class)
    public MovimientoInventario registrarEntrada(
            Long productoId, Long repisaDestinoId, int cantidad,
            String lote, String observacion, Usuario actor
    ) {
        validarCantidadPositiva(cantidad);
        Producto producto = buscarProducto(productoId);
        Repisa destino = buscarRepisa(repisaDestinoId);
        Empresa empresa = resolverEmpresa(destino);

        Item item = buscarOCrearItem(producto, destino);
        item.setCantidad(item.getCantidad() + cantidad);
        if (lote != null && !lote.isBlank()) {
            item.setLote(lote.trim());
        }
        itemRepository.save(item);

        MovimientoInventario mov = new MovimientoInventario();
        mov.setEmpresa(empresa);
        mov.setProducto(producto);
        mov.setRepisaDestino(destino);
        mov.setCantidadMovida(cantidad);
        mov.setTipo(TipoMovimiento.ENTRADA);
        mov.setObservacion(observacion);
        mov.setUsuario(actor);

        MovimientoInventario guardado = movimientoRepository.save(mov);
        log.info("ENTRADA: producto={} cantidad={} destino=repisa:{} actor={}", productoId, cantidad, repisaDestinoId, actor.getId());
        return guardado;
    }

    @Transactional(rollbackFor = Exception.class)
    public MovimientoInventario registrarSalida(
            Long productoId, Long repisaOrigenId, int cantidad,
            String observacion, Usuario actor
    ) {
        validarCantidadPositiva(cantidad);
        Producto producto = buscarProducto(productoId);
        Repisa origen = buscarRepisa(repisaOrigenId);
        Empresa empresa = resolverEmpresa(origen);

        Item item = buscarItemExistente(producto, origen);
        if (item.getCantidad() < cantidad) {
            throw new IllegalArgumentException(
                    "Stock insuficiente. Disponible: " + item.getCantidad() + ", solicitado: " + cantidad);
        }
        item.setCantidad(item.getCantidad() - cantidad);
        itemRepository.save(item);

        MovimientoInventario mov = new MovimientoInventario();
        mov.setEmpresa(empresa);
        mov.setProducto(producto);
        mov.setRepisaOrigen(origen);
        mov.setCantidadMovida(cantidad);
        mov.setTipo(TipoMovimiento.SALIDA);
        mov.setObservacion(observacion);
        mov.setUsuario(actor);

        MovimientoInventario guardado = movimientoRepository.save(mov);
        log.info("SALIDA: producto={} cantidad={} origen=repisa:{} actor={}", productoId, cantidad, repisaOrigenId, actor.getId());
        return guardado;
    }

    @Transactional(rollbackFor = Exception.class)
    public MovimientoInventario registrarTraslado(
            Long productoId, Long repisaOrigenId, Long repisaDestinoId, int cantidad,
            String observacion, Usuario actor
    ) {
        validarCantidadPositiva(cantidad);
        if (repisaOrigenId.equals(repisaDestinoId)) {
            throw new IllegalArgumentException("Repisa origen y destino no pueden ser la misma");
        }

        Producto producto = buscarProducto(productoId);
        Repisa origen = buscarRepisa(repisaOrigenId);
        Repisa destino = buscarRepisa(repisaDestinoId);
        Empresa empresa = resolverEmpresa(origen);

        Item itemOrigen = buscarItemExistente(producto, origen);
        if (itemOrigen.getCantidad() < cantidad) {
            throw new IllegalArgumentException(
                    "Stock insuficiente en origen. Disponible: " + itemOrigen.getCantidad() + ", solicitado: " + cantidad);
        }
        itemOrigen.setCantidad(itemOrigen.getCantidad() - cantidad);
        itemRepository.save(itemOrigen);

        Item itemDestino = buscarOCrearItem(producto, destino);
        itemDestino.setCantidad(itemDestino.getCantidad() + cantidad);
        itemRepository.save(itemDestino);

        MovimientoInventario mov = new MovimientoInventario();
        mov.setEmpresa(empresa);
        mov.setProducto(producto);
        mov.setRepisaOrigen(origen);
        mov.setRepisaDestino(destino);
        mov.setCantidadMovida(cantidad);
        mov.setTipo(TipoMovimiento.TRASLADO);
        mov.setObservacion(observacion);
        mov.setUsuario(actor);

        MovimientoInventario guardado = movimientoRepository.save(mov);
        log.info("TRASLADO: producto={} cantidad={} origen=repisa:{} destino=repisa:{} actor={}",
                productoId, cantidad, repisaOrigenId, repisaDestinoId, actor.getId());
        return guardado;
    }

    @Transactional(rollbackFor = Exception.class)
    public MovimientoInventario registrarAjuste(
            Long productoId, Long repisaId, int nuevaCantidad,
            String observacion, Usuario actor
    ) {
        if (nuevaCantidad < 0) {
            throw new IllegalArgumentException("La cantidad ajustada no puede ser negativa");
        }

        Producto producto = buscarProducto(productoId);
        Repisa repisa = buscarRepisa(repisaId);
        Empresa empresa = resolverEmpresa(repisa);

        Item item = buscarOCrearItem(producto, repisa);
        int diferencia = nuevaCantidad - item.getCantidad();
        item.setCantidad(nuevaCantidad);
        itemRepository.save(item);

        MovimientoInventario mov = new MovimientoInventario();
        mov.setEmpresa(empresa);
        mov.setProducto(producto);
        mov.setRepisaDestino(repisa);
        mov.setCantidadMovida(Math.abs(diferencia));
        mov.setTipo(TipoMovimiento.AJUSTE);
        mov.setObservacion("Ajuste de " + (item.getCantidad() - Math.abs(diferencia)) + " a " + nuevaCantidad
                + (observacion != null ? ". " + observacion : ""));
        mov.setUsuario(actor);

        MovimientoInventario guardado = movimientoRepository.save(mov);
        log.info("AJUSTE: producto={} nuevaCantidad={} diferencia={} repisa:{} actor={}",
                productoId, nuevaCantidad, diferencia, repisaId, actor.getId());
        return guardado;
    }

    private void validarCantidadPositiva(int cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
    }

    private Producto buscarProducto(Long productoId) {
        return productoRepository.findById(productoId)
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado: " + productoId));
    }

    private Repisa buscarRepisa(Long repisaId) {
        return repisaRepository.findById(repisaId)
                .orElseThrow(() -> new IllegalArgumentException("Repisa no encontrada: " + repisaId));
    }

    private Empresa resolverEmpresa(Repisa repisa) {
        Armario armario = repisa.getArmario();
        if (armario == null) throw new IllegalStateException("Repisa sin armario");
        Almacen almacen = armario.getAlmacen();
        if (almacen == null) throw new IllegalStateException("Armario sin almacén");
        Empresa empresa = almacen.getEmpresa();
        if (empresa == null) throw new IllegalStateException("Almacén sin empresa");
        return empresa;
    }

    private Item buscarItemExistente(Producto producto, Repisa repisa) {
        List<Item> items = itemRepository.findByRepisa(repisa);
        return items.stream()
                .filter(i -> i.getProducto() != null && i.getProducto().getId().equals(producto.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "No hay stock del producto " + producto.getSku() + " en la repisa " + repisa.getId()));
    }

    private Item buscarOCrearItem(Producto producto, Repisa repisa) {
        List<Item> items = itemRepository.findByRepisa(repisa);
        return items.stream()
                .filter(i -> i.getProducto() != null && i.getProducto().getId().equals(producto.getId()))
                .findFirst()
                .orElseGet(() -> {
                    Item nuevo = new Item();
                    nuevo.setProducto(producto);
                    nuevo.setRepisa(repisa);
                    nuevo.setNombre(producto.getNombre());
                    nuevo.setEstado("ACTIVO");
                    nuevo.setTamanio(1);
                    nuevo.setCantidad(0);
                    nuevo.setEstadoStock(EstadoStock.DISPONIBLE);
                    return nuevo;
                });
    }
}
