package com.example.maingest.service;

import com.example.maingest.domain.AuditoriaEvento;
import com.example.maingest.domain.Usuario;
import com.example.maingest.repository.AuditoriaEventoRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

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

    public List<AuditoriaEvento> buscar(String usuarioCorreo, String objetoTipo, String accion, String texto) {
        List<AuditoriaEvento> base = auditoriaEventoRepository.findTop200ByOrderByCreadoEnDesc();
        return base.stream()
                .filter(e -> {
                    if (usuarioCorreo == null || usuarioCorreo.isBlank()) {
                        return true;
                    }
                    String correo = e.getUsuarioCorreo();
                    if (correo == null) {
                        return false;
                    }
                    return correo.toLowerCase(Locale.ROOT).contains(usuarioCorreo.toLowerCase(Locale.ROOT));
                })
                .filter(e -> {
                    if (objetoTipo == null || objetoTipo.isBlank()) {
                        return true;
                    }
                    String tipo = e.getObjetoTipo();
                    if (tipo == null) {
                        return false;
                    }
                    return tipo.toLowerCase(Locale.ROOT).contains(objetoTipo.toLowerCase(Locale.ROOT));
                })
                .filter(e -> {
                    if (accion == null || accion.isBlank()) {
                        return true;
                    }
                    String acc = e.getAccion();
                    if (acc == null) {
                        return false;
                    }
                    return acc.toLowerCase(Locale.ROOT).contains(accion.toLowerCase(Locale.ROOT));
                })
                .filter(e -> {
                    if (texto == null || texto.isBlank()) {
                        return true;
                    }
                    String lower = texto.toLowerCase(Locale.ROOT);
                    String desc = e.getDescripcion() != null ? e.getDescripcion() : "";
                    String detalles = e.getDetallesJson() != null ? e.getDetallesJson() : "";
                    return desc.toLowerCase(Locale.ROOT).contains(lower)
                            || detalles.toLowerCase(Locale.ROOT).contains(lower);
                })
                .collect(Collectors.toList());
    }
}

