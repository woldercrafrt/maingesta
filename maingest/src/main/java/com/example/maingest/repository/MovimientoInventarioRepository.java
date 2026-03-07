package com.example.maingest.repository;

import com.example.maingest.domain.MovimientoInventario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {

    @Query("SELECT m FROM MovimientoInventario m "
            + "JOIN FETCH m.producto "
            + "JOIN FETCH m.usuario "
            + "LEFT JOIN FETCH m.repisaOrigen "
            + "LEFT JOIN FETCH m.repisaDestino "
            + "WHERE m.empresa.id = :empresaId "
            + "ORDER BY m.fecha DESC")
    Page<MovimientoInventario> findByEmpresaIdConRelaciones(
            @Param("empresaId") Long empresaId, Pageable pageable);

    @Query("SELECT m FROM MovimientoInventario m "
            + "JOIN FETCH m.producto "
            + "JOIN FETCH m.usuario "
            + "LEFT JOIN FETCH m.repisaOrigen "
            + "LEFT JOIN FETCH m.repisaDestino "
            + "WHERE m.empresa.id = :empresaId AND m.producto.id = :productoId "
            + "ORDER BY m.fecha DESC")
    Page<MovimientoInventario> findByEmpresaIdAndProductoIdConRelaciones(
            @Param("empresaId") Long empresaId,
            @Param("productoId") Long productoId,
            Pageable pageable);

    @Query("SELECT m FROM MovimientoInventario m "
            + "JOIN FETCH m.producto "
            + "JOIN FETCH m.usuario "
            + "LEFT JOIN FETCH m.repisaOrigen "
            + "LEFT JOIN FETCH m.repisaDestino "
            + "WHERE m.empresa.id = :empresaId AND m.tipo = :tipo "
            + "ORDER BY m.fecha DESC")
    Page<MovimientoInventario> findByEmpresaIdAndTipoConRelaciones(
            @Param("empresaId") Long empresaId,
            @Param("tipo") com.example.maingest.domain.TipoMovimiento tipo,
            Pageable pageable);

    @Query("SELECT COUNT(m) FROM MovimientoInventario m WHERE m.empresa.id = :empresaId")
    long countByEmpresaId(@Param("empresaId") Long empresaId);
}
