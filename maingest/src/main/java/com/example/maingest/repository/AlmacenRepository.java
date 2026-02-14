package com.example.maingest.repository;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlmacenRepository extends JpaRepository<Almacen, Long> {

    List<Almacen> findByEmpresa(Empresa empresa);
}

