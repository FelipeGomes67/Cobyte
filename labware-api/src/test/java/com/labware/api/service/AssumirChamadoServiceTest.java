package com.labware.api.service;

import com.labware.api.model.entity.*;
import com.labware.api.model.enums.*;
import com.labware.api.repository.*;
import com.labware.api.dto.request.AlterarStatusRequest;
import org.junit.jupiter.api.*;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssumirChamadoServiceTest {
    @Mock ChamadoRepository chamados;
    @Mock UsuarioRepository usuarios;
    @Mock ClassificacaoIaRepository classificacoes;
    @Mock HistoricoChamadoRepository historicos;
    @Mock AcessoChamadoService acesso;
    @Mock SlaChamadoService sla;
    @Mock NotificacaoService notificacoes;
    @InjectMocks ChamadoService service;
    Chamado chamado;
    Usuario primeiro;
    Usuario segundo;

    @BeforeEach void preparar() {
        primeiro = Usuario.builder().id(1L).nome("Ana").perfil(PerfilUsuario.SUPORTE).build();
        segundo = Usuario.builder().id(2L).nome("Bruno").perfil(PerfilUsuario.SUPORTE).build();
        chamado = Chamado.builder().id(10L).status(StatusChamado.EM_ATENDIMENTO)
                .empresa(Empresa.builder().id(1L).nome("Empresa").build())
                .solicitante(Usuario.builder().id(3L).nome("Cliente").build()).responsavel(primeiro).build();
        when(chamados.findParaAvaliacao(10L)).thenReturn(Optional.of(chamado));
        when(usuarios.findById(2L)).thenReturn(Optional.of(segundo));
    }

    @Test void segundoTecnicoEntraSemRemoverOPrimeiro() {
        when(acesso.ehSuporte(segundo)).thenReturn(true);
        var resposta = service.assumir(10L, 2L);
        assertSame(primeiro, chamado.getResponsavel());
        assertEquals(java.util.List.of(1L, 2L), resposta.tecnicos().stream().map(t -> t.id()).toList());
        assertEquals(StatusChamado.EM_ATENDIMENTO, chamado.getStatus());
        verify(historicos).save(any());
    }

    @Test void repetirNaoDuplicaTecnicoOuHistorico() {
        when(acesso.ehSuporte(segundo)).thenReturn(true);
        service.assumir(10L, 2L);
        service.assumir(10L, 2L);
        assertEquals(2, chamado.getTecnicos().size());
        verify(historicos, times(1)).save(any());
    }

    @Test void primeiroAtendimentoPassaParaAnalise() {
        when(acesso.ehSuporte(segundo)).thenReturn(true);
        chamado.setResponsavel(null);
        chamado.setStatus(StatusChamado.ABERTO);
        service.assumir(10L, 2L);
        assertSame(segundo, chamado.getResponsavel());
        assertEquals(StatusChamado.EM_ANALISE, chamado.getStatus());
    }

    @Test void tecnicoPreAtribuidoTambemIniciaAnalise() {
        when(acesso.ehSuporte(segundo)).thenReturn(true);
        chamado.setResponsavel(segundo);
        chamado.setStatus(StatusChamado.ABERTO);
        service.assumir(10L, 2L);
        assertEquals(StatusChamado.EM_ANALISE, chamado.getStatus());
    }

    @Test void clienteNaoPodeAssumir() {
        segundo.setPerfil(PerfilUsuario.CLIENTE);
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.assumir(10L, 2L)).getStatusCode().value());
        assertTrue(chamado.getTecnicos().isEmpty());
    }

    @Test void encerradoNaoAceitaTecnico() {
        when(acesso.ehSuporte(segundo)).thenReturn(true);
        for (var status : java.util.List.of(StatusChamado.RESOLVIDO, StatusChamado.FECHADO, StatusChamado.CANCELADO)) {
            chamado.setStatus(status);
            assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.assumir(10L, 2L)).getStatusCode().value());
        }
        assertTrue(chamado.getTecnicos().isEmpty());
    }

    @Test void segundoTecnicoPodeAlterarStatus() {
        chamado.adicionarTecnico(segundo);
        service.alterarStatus(10L, 2L, new AlterarStatusRequest(StatusChamado.RESOLVIDO, null));
        assertEquals(StatusChamado.RESOLVIDO, chamado.getStatus());
    }

    @Test void tecnicoForaDaEquipeNaoPodeAlterarStatus() {
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.alterarStatus(10L, 2L, new AlterarStatusRequest(StatusChamado.RESOLVIDO, null))).getStatusCode().value());
    }
}
