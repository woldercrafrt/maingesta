package com.example.maingest.repository;

import com.example.maingest.domain.Permiso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermisoRepository extends JpaRepository<Permiso, Long> {

    Optional<Permiso> findByNombre(String nombre);

    List<Permiso> findByArea(String area);

    Optional<Permiso> findByAreaAndCodigo(String area, Integer codigo);
}
