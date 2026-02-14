package com.example.maingest.repository;

import com.example.maingest.domain.Reporte;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReporteRepository extends JpaRepository<Reporte, Long> {

    List<Reporte> findByTipo(String tipo);
}

