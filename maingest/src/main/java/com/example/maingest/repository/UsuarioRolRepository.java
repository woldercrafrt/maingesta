package com.example.maingest.repository;

import com.example.maingest.domain.Rol;
import com.example.maingest.domain.Usuario;
import com.example.maingest.domain.UsuarioRol;
import com.example.maingest.domain.UsuarioRolId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, UsuarioRolId> {

    List<UsuarioRol> findByUsuario(Usuario usuario);

    long countByRol(Rol rol);
}
