package com.example.maingest.repository;

import com.example.maingest.domain.AuditoriaEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditoriaEventoRepository extends JpaRepository<AuditoriaEvento, Long> {

    List<AuditoriaEvento> findTop200ByOrderByCreadoEnDesc();
}

