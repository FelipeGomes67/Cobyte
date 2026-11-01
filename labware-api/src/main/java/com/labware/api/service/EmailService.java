package com.labware.api.service;

import lombok.RequiredArgsConstructor;
import com.labware.api.model.entity.EmailPendente;
import com.labware.api.repository.EmailPendenteRepository;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final EmailPendenteRepository emails;

    public record EmailNotificacao(String destinatario, String titulo, String texto) {}

    // Persiste na mesma transação da notificação: rollback cancela os dois registros.
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void enfileirar(EmailNotificacao evento) {
        emails.save(EmailPendente.builder().destinatario(evento.destinatario())
                .titulo(evento.titulo()).texto(evento.texto()).build());
    }
}
