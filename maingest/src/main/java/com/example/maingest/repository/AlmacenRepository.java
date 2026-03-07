package com.example.maingest.repository;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlmacenRepository extends JpaRepository<Almacen, Long> {

    List<Almacen> findByEmpresa(Empresa empresa);

    @Query("SELECT COUNT(a) FROM Almacen a WHERE a.empresa.id = :empresaId")
    long countByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(ar) FROM Armario ar JOIN ar.almacen a WHERE a.empresa.id = :empresaId")
    long countArmariosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(r) FROM Repisa r JOIN r.armario ar JOIN ar.almacen a WHERE a.empresa.id = :empresaId")
    long countRepisasByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(i) FROM Item i JOIN i.repisa r JOIN r.armario ar JOIN ar.almacen a WHERE a.empresa.id = :empresaId")
    long countItemsByEmpresaId(@Param("empresaId") Long empresaId);
}

