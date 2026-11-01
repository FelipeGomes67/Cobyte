package com.labware.api.service;

import com.labware.api.dto.request.ConfiguracaoNotificacaoRequest;
import com.labware.api.model.entity.Usuario;
import com.labware.api.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.context.ApplicationEventPublisher;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificacaoServiceTest {
    NotificacaoRepository notificacoes;
    UsuarioRepository usuarios;
    ApplicationEventPublisher eventos;
    NotificacaoService service;
    Usuario usuario;

    @BeforeEach void preparar() {
        notificacoes = mock(NotificacaoRepository.class);
        usuarios = mock(UsuarioRepository.class);
        eventos = mock(ApplicationEventPublisher.class);
        service = new NotificacaoService(notificacoes, usuarios, eventos);
        usuario = Usuario.builder().id(1L).email("cliente@teste.com").build();
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario));
    }

    @Test void enviaEmailMesmoComPreferenciaLegadaDesativada() {
        usuario.setPreferenciasNotificacao(Map.of("notificarEmail", false));
        service.emitir(usuario, 2L, null, "MENSAGEM", "Titulo", "Texto");
        verify(notificacoes).save(any());
        verify(eventos).publishEvent(new EmailService.EmailNotificacao("cliente@teste.com", "Titulo", "Texto"));
    }

    @Test void filtrosBloqueiamEmailENotificacaoDoTipoSelecionado() {
        for (String[] caso : List.of(new String[]{"MENSAGEM", "novasMensagens"},
                new String[]{"ATRIBUICAO", "atribuicoes"}, new String[]{"STATUS", "alteracoesStatus"})) {
            usuario.setPreferenciasNotificacao(Map.of(caso[1], false));
            service.emitir(usuario, 2L, null, caso[0], "Titulo", "Texto");
        }
        verifyNoInteractions(notificacoes, eventos);
    }

    @Test void filtrosSaoIndependentes() {
        usuario.setPreferenciasNotificacao(Map.of("novasMensagens", false));
        service.emitir(usuario, 2L, null, "ATRIBUICAO", "Titulo", "Texto");
        verify(eventos).publishEvent(any(EmailService.EmailNotificacao.class));
    }

    @Test void naoNotificaOProprioAutor() {
        service.emitir(usuario, 1L, null, "MENSAGEM", "Titulo", "Texto");
        verifyNoInteractions(notificacoes, eventos);
    }

    @Test void preferenciasAusentesHabilitamTodosOsTipos() {
        usuario.setPreferenciasNotificacao(null);
        assertEquals(new ConfiguracaoNotificacaoRequest(true, true, true), service.preferencias(1L));
        service.emitir(usuario, 2L, null, "MENSAGEM", "Titulo", "Texto");
        verify(eventos).publishEvent(any(EmailService.EmailNotificacao.class));
    }

    @Test void atualizaFiltrosERemovePreferenciaLegada() {
        usuario.setPreferenciasNotificacao(Map.of("notificarEmail", false));
        var esperado = new ConfiguracaoNotificacaoRequest(false, true, false);
        assertEquals(esperado, service.preferencias(1L, esperado));
        assertEquals(esperado, service.preferencias(1L));
        assertFalse(usuario.getPreferenciasNotificacao().containsKey("notificarEmail"));
    }
}
