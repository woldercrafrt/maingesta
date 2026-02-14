package com.example.maingest.repository;

import com.example.maingest.domain.Empresa;
import com.example.maingest.domain.EmpresaUsuario;
import com.example.maingest.domain.EmpresaUsuarioId;
import com.example.maingest.domain.Usuario;
import com.example.maingest.domain.Rol;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmpresaUsuarioRepository extends JpaRepository<EmpresaUsuario, EmpresaUsuarioId> {

    List<EmpresaUsuario> findByUsuario(Usuario usuario);

    List<EmpresaUsuario> findByEmpresa(Empresa empresa);

    Optional<EmpresaUsuario> findByEmpresaAndUsuario(Empresa empresa, Usuario usuario);

    List<EmpresaUsuario> findAllByEmpresaAndUsuario(Empresa empresa, Usuario usuario);

    long countByEmpresaAndRol(Empresa empresa, Rol rol);

    void deleteByEmpresaAndUsuario(Empresa empresa, Usuario usuario);
}
