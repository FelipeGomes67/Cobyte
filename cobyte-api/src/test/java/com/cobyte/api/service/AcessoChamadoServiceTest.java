package com.cobyte.api.service;

import com.cobyte.api.model.entity.*;
import com.cobyte.api.model.enums.PerfilUsuario;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class AcessoChamadoServiceTest {
    private final AcessoChamadoService acesso = new AcessoChamadoService();
    private final Empresa empresa = Empresa.builder().id(1L).build();
    private final Usuario autor = Usuario.builder().id(10L).perfil(PerfilUsuario.CLIENTE).empresa(empresa).build();
    private final Chamado chamado = Chamado.builder().id(100L).empresa(empresa).solicitante(autor).build();

    @Test void colegaDaEmpresaPodeLerEAlterarSemSeTornarSolicitante() {
        var colega = Usuario.builder().id(20L).perfil(PerfilUsuario.CLIENTE).empresa(empresa).build();
        assertDoesNotThrow(() -> acesso.exigirLeitura(chamado, colega));
        assertDoesNotThrow(() -> acesso.exigirEdicao(chamado, colega));
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> acesso.exigirSolicitante(chamado, colega)).getStatusCode().value());
    }

    @Test void outraEmpresaNaoPodeLerNemAlterar() {
        var externo = Usuario.builder().id(20L).perfil(PerfilUsuario.CLIENTE)
                .empresa(Empresa.builder().id(2L).build()).build();
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> acesso.exigirLeitura(chamado, externo)).getStatusCode().value());
        assertThrows(ResponseStatusException.class, () -> acesso.exigirEdicao(chamado, externo));
    }

    @Test void clienteSemEmpresaNaoAcessaNemSeuChamado() {
        autor.setEmpresa(null);
        assertThrows(ResponseStatusException.class, () -> acesso.exigirLeitura(chamado, autor));
        assertThrows(ResponseStatusException.class, () -> acesso.exigirEdicao(chamado, autor));
    }

    @Test void autorPodeAcessarSeuChamado() {
        assertDoesNotThrow(() -> acesso.exigirLeitura(chamado, autor));
        assertDoesNotThrow(() -> acesso.exigirEdicao(chamado, autor));
    }

    @Test void suportePodeLerMasSoEditaDepoisDeParticipar() {
        var suporte = Usuario.builder().id(30L).perfil(PerfilUsuario.SUPORTE).build();
        assertDoesNotThrow(() -> acesso.exigirLeitura(chamado, suporte));
        assertThrows(ResponseStatusException.class, () -> acesso.exigirEdicao(chamado, suporte));
        chamado.adicionarTecnico(suporte);
        assertDoesNotThrow(() -> acesso.exigirEdicao(chamado, suporte));
    }

    @Test void semUsuarioNaoAcessa() {
        assertThrows(ResponseStatusException.class, () -> acesso.exigirLeitura(chamado, null));
    }
}
