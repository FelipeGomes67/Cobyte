package com.cobyte.api.service;

import com.cobyte.api.model.entity.Chamado;
import com.cobyte.api.model.enums.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class FluxoChamadoTest {
    @ParameterizedTest
    @EnumSource(value = StatusChamado.class, names = {"EM_ATENDIMENTO", "AGUARDANDO_CLIENTE", "RESOLVIDO", "FECHADO"})
    void exigeAmbosOsCamposAntesDeAvancar(StatusChamado destino) {
        var c = Chamado.builder().status(StatusChamado.EM_ANALISE).build();
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> FluxoChamado.validarClassificacao(c, destino)).getStatusCode().value());
        c.setPrioridade(Prioridade.ALTA);
        assertThrows(ResponseStatusException.class, () -> FluxoChamado.validarClassificacao(c, destino));
        c.setPrioridade(null); c.setCategoria(CategoriaChamado.ERRO_FUNCIONAL);
        assertThrows(ResponseStatusException.class, () -> FluxoChamado.validarClassificacao(c, destino));
        c.setPrioridade(Prioridade.ALTA);
        assertDoesNotThrow(() -> FluxoChamado.validarClassificacao(c, destino));
    }
    @Test void categoriaLivreValidaTambemPermiteAvancar() {
        var c = Chamado.builder().prioridade(Prioridade.MEDIA).categoriaPersonalizada("   ").build();
        assertThrows(ResponseStatusException.class, () -> FluxoChamado.validarClassificacao(c, StatusChamado.EM_ATENDIMENTO));
        c.setCategoriaPersonalizada("Falha de equipamento");
        assertDoesNotThrow(() -> FluxoChamado.validarClassificacao(c, StatusChamado.EM_ATENDIMENTO));
    }
    @Test void podeEntrarEmAnaliseOuCancelarSemClassificacao() {
        var c = Chamado.builder().build();
        assertDoesNotThrow(() -> FluxoChamado.validarClassificacao(c, StatusChamado.EM_ANALISE));
        assertDoesNotThrow(() -> FluxoChamado.validarClassificacao(c, StatusChamado.CANCELADO));
    }
    @Test void atendimentoNaoRetornaParaAnalise() {
        assertFalse(StatusChamado.EM_ATENDIMENTO.podeIrPara(StatusChamado.EM_ANALISE));
        assertFalse(StatusChamado.AGUARDANDO_CLIENTE.podeIrPara(StatusChamado.EM_ANALISE));
        assertFalse(StatusChamado.RESOLVIDO.podeIrPara(StatusChamado.EM_ANALISE));
        assertTrue(StatusChamado.ABERTO.podeIrPara(StatusChamado.EM_ANALISE));
    }
}
