package com.labware.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    private final JavaMailSender mailSender;
    @Value("${labware.email.remetente}")
    private String remetente;

    public record EmailNotificacao(String destinatario, String titulo, String texto) {}

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void enviar(EmailNotificacao evento) {
        try {
            var mensagem = new SimpleMailMessage();
            mensagem.setFrom(remetente);
            mensagem.setTo(evento.destinatario());
            mensagem.setSubject(evento.titulo());
            mensagem.setText(evento.texto());
            mailSender.send(mensagem);
            log.info("E-mail de notificação enviado com sucesso para: {}", evento.destinatario());
        } catch (org.springframework.mail.MailException ex) {
            log.error("Falha ao enviar e-mail de notificação para {}", evento.destinatario(), ex);
        }
    }
}
