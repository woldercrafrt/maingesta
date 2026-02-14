package com.example.maingest.repository;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.Armario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ArmarioRepository extends JpaRepository<Armario, Long> {

    List<Armario> findByAlmacen(Almacen almacen);
}

