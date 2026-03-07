package com.example.maingest.repository;

import com.example.maingest.domain.AuditoriaEvento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface AuditoriaEventoRepository extends JpaRepository<AuditoriaEvento, Long> {

    List<AuditoriaEvento> findTop200ByOrderByCreadoEnDesc();

    @Query("SELECT e FROM AuditoriaEvento e WHERE "
            + "(:usuarioCorreo IS NULL OR LOWER(e.usuarioCorreo) LIKE LOWER(CONCAT('%', :usuarioCorreo, '%'))) AND "
            + "(:objetoTipo IS NULL OR LOWER(e.objetoTipo) LIKE LOWER(CONCAT('%', :objetoTipo, '%'))) AND "
            + "(:accion IS NULL OR LOWER(e.accion) LIKE LOWER(CONCAT('%', :accion, '%'))) AND "
            + "(:texto IS NULL OR LOWER(e.descripcion) LIKE LOWER(CONCAT('%', :texto, '%')) "
            + "  OR :texto IS NULL OR e.detallesJson LIKE CONCAT('%', :texto, '%')) "
            + "ORDER BY e.creadoEn DESC")
    Page<AuditoriaEvento> buscarConFiltros(
            @Param("usuarioCorreo") String usuarioCorreo,
            @Param("objetoTipo") String objetoTipo,
            @Param("accion") String accion,
            @Param("texto") String texto,
            Pageable pageable
    );

    @Query("SELECT e FROM AuditoriaEvento e WHERE "
            + "e.usuarioId IN :usuarioIds AND "
            + "(:usuarioCorreo IS NULL OR LOWER(e.usuarioCorreo) LIKE LOWER(CONCAT('%', :usuarioCorreo, '%'))) AND "
            + "(:objetoTipo IS NULL OR LOWER(e.objetoTipo) LIKE LOWER(CONCAT('%', :objetoTipo, '%'))) AND "
            + "(:accion IS NULL OR LOWER(e.accion) LIKE LOWER(CONCAT('%', :accion, '%'))) AND "
            + "(:texto IS NULL OR LOWER(e.descripcion) LIKE LOWER(CONCAT('%', :texto, '%')) "
            + "  OR :texto IS NULL OR e.detallesJson LIKE CONCAT('%', :texto, '%')) "
            + "ORDER BY e.creadoEn DESC")
    Page<AuditoriaEvento> buscarConFiltrosYUsuarios(
            @Param("usuarioIds") Set<Long> usuarioIds,
            @Param("usuarioCorreo") String usuarioCorreo,
            @Param("objetoTipo") String objetoTipo,
            @Param("accion") String accion,
            @Param("texto") String texto,
            Pageable pageable
    );
}

