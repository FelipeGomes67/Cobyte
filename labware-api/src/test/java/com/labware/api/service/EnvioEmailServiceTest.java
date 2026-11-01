package com.labware.api.service;

import com.labware.api.model.entity.EmailPendente;
import com.labware.api.repository.EmailPendenteRepository;
import org.junit.jupiter.api.*;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import java.time.Instant;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EnvioEmailServiceTest {
    EmailPendenteRepository emails;
    JavaMailSender sender;
    EnvioEmailService service;
    EmailPendente email;

    @BeforeEach void preparar() {
        emails = mock(EmailPendenteRepository.class);
        sender = mock(JavaMailSender.class);
        service = new EnvioEmailService(emails, sender, "origem@teste.com", 8);
        email = EmailPendente.builder().id(1L).destinatario("destino@teste.com").titulo("Titulo").texto("Texto").build();
        when(emails.bloquearProximo(any())).thenReturn(Optional.of(email));
    }

    @Test void envioBemSucedidoMarcaComoEnviado() {
        email.setUltimoErro("FalhaAnterior");
        assertTrue(service.enviarProximo());
        assertEquals(EmailPendente.Estado.ENVIADO, email.getEstado());
        assertEquals(1, email.getTentativas());
        assertNotNull(email.getEnviadoEm());
        assertNull(email.getUltimoErro());
        var mensagem = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(mensagem.capture());
        assertEquals("origem@teste.com", mensagem.getValue().getFrom());
        assertArrayEquals(new String[]{"destino@teste.com"}, mensagem.getValue().getTo());
        assertEquals("Titulo", mensagem.getValue().getSubject());
        assertEquals("Texto", mensagem.getValue().getText());
    }

    @Test void falhaAgendaRetentativaSemDescartarMensagem() {
        doThrow(new MailSendException("Detalhes privados")).when(sender).send(any(SimpleMailMessage.class));
        Instant antes = Instant.now();
        assertTrue(service.enviarProximo());
        assertEquals(EmailPendente.Estado.PENDENTE, email.getEstado());
        assertTrue(email.getProximaTentativa().isAfter(antes.plusSeconds(29)));
        assertEquals("MailSendException", email.getUltimoErro());
        assertNull(email.getEnviadoEm());
    }

    @Test void retentativasTemIntervalosProgressivos() {
        email.setTentativas(3);
        doThrow(new MailSendException("SMTP fora")).when(sender).send(any(SimpleMailMessage.class));
        Instant antes = Instant.now();
        service.enviarProximo();
        assertTrue(email.getProximaTentativa().isAfter(antes.plusSeconds(239)));
    }

    @Test void esgotamentoMantemRegistroParaDiagnostico() {
        email.setTentativas(7);
        doThrow(new MailSendException("SMTP fora")).when(sender).send(any(SimpleMailMessage.class));
        service.enviarProximo();
        assertEquals(EmailPendente.Estado.FALHOU, email.getEstado());
        assertEquals(8, email.getTentativas());
    }

    @Test void filaVaziaNaoAcionaSmtp() {
        when(emails.bloquearProximo(any())).thenReturn(Optional.empty());
        assertFalse(service.enviarProximo());
        verifyNoInteractions(sender);
    }
}
