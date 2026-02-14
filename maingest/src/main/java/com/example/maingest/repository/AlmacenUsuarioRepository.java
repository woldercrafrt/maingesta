package com.example.maingest.repository;

import com.example.maingest.domain.Almacen;
import com.example.maingest.domain.AlmacenUsuario;
import com.example.maingest.domain.AlmacenUsuarioId;
import com.example.maingest.domain.Usuario;
import com.example.maingest.domain.Rol;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlmacenUsuarioRepository extends JpaRepository<AlmacenUsuario, AlmacenUsuarioId> {

    List<AlmacenUsuario> findByUsuario(Usuario usuario);

    List<AlmacenUsuario> findByAlmacen(Almacen almacen);

    Optional<AlmacenUsuario> findByAlmacenAndUsuario(Almacen almacen, Usuario usuario);

    List<AlmacenUsuario> findAllByAlmacenAndUsuario(Almacen almacen, Usuario usuario);

    long countByAlmacenAndRol(Almacen almacen, Rol rol);

    void deleteByAlmacenAndUsuario(Almacen almacen, Usuario usuario);
}
