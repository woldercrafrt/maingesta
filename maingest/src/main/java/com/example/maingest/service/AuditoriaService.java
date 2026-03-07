package com.example.maingest.service;

import com.example.maingest.domain.AuditoriaEvento;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.AuditoriaEventoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Set;

@Service
public class AuditoriaService {

    private final AuditoriaEventoRepository auditoriaEventoRepository;

    public AuditoriaService(AuditoriaEventoRepository auditoriaEventoRepository) {
        this.auditoriaEventoRepository = auditoriaEventoRepository;
    }

    public void registrar(Usuario actor, String accion, String objetoTipo, Long objetoId, String descripcion, String detallesJson) {
        if (actor == null) {
            return;
        }
        AuditoriaEvento evento = new AuditoriaEvento();
        evento.setUsuarioId(actor.getId());
        evento.setUsuarioCorreo(actor.getCorreo());
        evento.setAccion(accion);
        evento.setObjetoTipo(objetoTipo);
        evento.setObjetoId(objetoId);
        evento.setDescripcion(descripcion);
        evento.setDetallesJson(detallesJson);
        evento.setCreadoEn(Instant.now());
        auditoriaEventoRepository.save(evento);
    }

    public Page<AuditoriaEvento> buscar(String usuarioCorreo, String objetoTipo, String accion, String texto, Pageable pageable) {
        String correoParam = (usuarioCorreo != null && !usuarioCorreo.isBlank()) ? usuarioCorreo.trim() : null;
        String tipoParam = (objetoTipo != null && !objetoTipo.isBlank()) ? objetoTipo.trim() : null;
        String accionParam = (accion != null && !accion.isBlank()) ? accion.trim() : null;
        String textoParam = (texto != null && !texto.isBlank()) ? texto.trim() : null;
        return auditoriaEventoRepository.buscarConFiltros(correoParam, tipoParam, accionParam, textoParam, pageable);
    }

    public Page<AuditoriaEvento> buscarPorUsuarios(Set<Long> usuarioIds, String usuarioCorreo, String objetoTipo, String accion, String texto, Pageable pageable) {
        String correoParam = (usuarioCorreo != null && !usuarioCorreo.isBlank()) ? usuarioCorreo.trim() : null;
        String tipoParam = (objetoTipo != null && !objetoTipo.isBlank()) ? objetoTipo.trim() : null;
        String accionParam = (accion != null && !accion.isBlank()) ? accion.trim() : null;
        String textoParam = (texto != null && !texto.isBlank()) ? texto.trim() : null;
        return auditoriaEventoRepository.buscarConFiltrosYUsuarios(usuarioIds, correoParam, tipoParam, accionParam, textoParam, pageable);
    }
}

