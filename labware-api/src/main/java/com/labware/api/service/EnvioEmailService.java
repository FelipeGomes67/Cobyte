package com.labware.api.service;

import com.labware.api.model.entity.EmailPendente.Estado;
import com.labware.api.repository.EmailPendenteRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service
@Slf4j
public class EnvioEmailService {
    private final EmailPendenteRepository emails;
    private final JavaMailSender mailSender;
    private final String remetente;
    private final int maxTentativas;

    public EnvioEmailService(EmailPendenteRepository emails, JavaMailSender mailSender,
                            @Value("${labware.email.remetente}") String remetente,
                            @Value("${labware.email.max-tentativas:8}") int maxTentativas) {
        if (maxTentativas < 1) throw new IllegalArgumentException("max-tentativas deve ser positivo");
        this.emails = emails;
        this.mailSender = mailSender;
        this.remetente = remetente;
        this.maxTentativas = maxTentativas;
    }

    @Transactional
    public boolean enviarProximo() {
        var proximo = emails.bloquearProximo(Instant.now());
        if (proximo.isEmpty()) return false;
        var email = proximo.get();
        email.setTentativas(email.getTentativas() + 1);
        try {
            var mensagem = new SimpleMailMessage();
            mensagem.setFrom(remetente);
            mensagem.setTo(email.getDestinatario());
            mensagem.setSubject(email.getTitulo());
            mensagem.setText(email.getTexto());
            mailSender.send(mensagem);
            email.setEstado(Estado.ENVIADO);
            email.setEnviadoEm(Instant.now());
            email.setUltimoErro(null);
        } catch (MailException ex) {
            // Não persiste a mensagem da exceção: pode conter credenciais ou dados do SMTP.
            email.setUltimoErro(ex.getClass().getSimpleName());
            if (email.getTentativas() >= maxTentativas) {
                email.setEstado(Estado.FALHOU);
                log.error("Email {} esgotou as {} tentativas", email.getId(), maxTentativas);
            } else {
                long segundos = Math.min(3600L, 30L * (1L << Math.min(7, email.getTentativas() - 1)));
                email.setProximaTentativa(Instant.now().plusSeconds(segundos));
                log.warn("Email {} reagendado após tentativa {}", email.getId(), email.getTentativas());
            }
        }
        return true;
    }
}
