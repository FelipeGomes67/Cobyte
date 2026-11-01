package com.labware.api.service;

import com.labware.api.model.entity.EmailPendente;
import com.labware.api.repository.EmailPendenteRepository;
import com.labware.api.support.JpaTestConfig;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

@SpringJUnitConfig(JpaTestConfig.class)
class FilaEmailIntegrationTest {
    @Autowired EmailPendenteRepository emails;
    @Autowired ApplicationEventPublisher eventos;
    @Autowired PlatformTransactionManager transactionManager;

    @BeforeEach void limpar() { emails.deleteAll(); }

    @Test void emailSoExisteSeTransacaoConfirmar() {
        var tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            eventos.publishEvent(new EmailService.EmailNotificacao("cliente@teste.com", "Titulo", "Texto"));
            assertEquals(1, emails.count());
            status.setRollbackOnly();
        });
        assertEquals(0, emails.count());
        tx.executeWithoutResult(status -> eventos.publishEvent(
                new EmailService.EmailNotificacao("cliente@teste.com", "Titulo", "Texto")));
        assertEquals(1, emails.count());
    }

    @Test void buscaApenasPendentesComPrazoVencido() {
        emails.save(EmailPendente.builder().destinatario("futuro@teste.com").titulo("Futuro").texto("Texto")
                .proximaTentativa(Instant.now().plusSeconds(600)).build());
        emails.save(EmailPendente.builder().destinatario("enviado@teste.com").titulo("Enviado").texto("Texto")
                .estado(EmailPendente.Estado.ENVIADO).build());
        var pendente = emails.save(EmailPendente.builder().destinatario("pendente@teste.com").titulo("Pendente").texto("Texto").build());
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            var encontrado = emails.bloquearProximo(Instant.now()).orElseThrow();
            assertEquals(pendente.getId(), encontrado.getId());
        });
    }
}
