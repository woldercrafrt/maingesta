package com.example.maingest.repository;

import com.example.maingest.domain.Rol;
import com.example.maingest.domain.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RolRepository extends JpaRepository<Rol, Long> {

    Optional<Rol> findByNombre(String nombre);

    List<Rol> findByEmpresa(Empresa empresa);
}

