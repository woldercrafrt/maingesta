package com.example.maingest.repository;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaSuscripcion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmpresaSuscripcionRepository extends JpaRepository<EmpresaSuscripcion, Long> {
    List<EmpresaSuscripcion> findByEmpresaOrderByCreatedAtDesc(Empresa empresa);
    Optional<EmpresaSuscripcion> findFirstByEmpresaAndEstadoOrderByCreatedAtDesc(Empresa empresa, String estado);
    List<EmpresaSuscripcion> findByEmpresa(Empresa empresa);
}
