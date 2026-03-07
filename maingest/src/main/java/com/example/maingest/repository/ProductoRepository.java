package com.example.maingest.repository;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.Producto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    List<Producto> findByEmpresa(Empresa empresa);

    Page<Producto> findByEmpresa(Empresa empresa, Pageable pageable);

    Page<Producto> findByEmpresaAndActivoTrue(Empresa empresa, Pageable pageable);

    Optional<Producto> findByEmpresaAndSku(Empresa empresa, String sku);

    boolean existsByEmpresaAndSku(Empresa empresa, String sku);

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.empresa.id = :empresaId")
    long countByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(p.sku, 5) AS int)), 0) FROM Producto p WHERE p.empresa.id = :empresaId AND p.sku LIKE 'PRD-%'")
    int findMaxSkuNumber(@Param("empresaId") Long empresaId);

    @Query("SELECT p FROM Producto p WHERE p.empresa.id = :empresaId AND "
            + "(LOWER(p.nombre) LIKE LOWER(CONCAT('%', :query, '%')) OR "
            + "LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Producto> buscar(@Param("empresaId") Long empresaId, @Param("query") String query, Pageable pageable);
}
