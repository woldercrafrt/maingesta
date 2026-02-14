package com.example.maingest.repository;

import com.example.maingest.domain.Rol;
import com.example.maingest.domain.RolPermiso;
import com.example.maingest.domain.RolPermisoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolPermisoRepository extends JpaRepository<RolPermiso, RolPermisoId> {

    List<RolPermiso> findByRol(Rol rol);
}
