package com.cobyte.api.service;

import java.time.Clock;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LimiteRequisicoesTest {
    @Test
    void janelaBloqueiaExcessoSemConsumirCotaDeOutraConta() {
        var relogio = mock(Clock.class);
        var limites = new LimiteRequisicoes(2, 2, 2, 2, 1, relogio);
        limites.consumir("conta-a", 2);
        limites.consumir("conta-a", 2);
        var erro = assertThrows(LimiteRequisicoes.Excedido.class, () -> limites.consumir("conta-a", 2));
        assertEquals("60", erro.getHeaders().getFirst("Retry-After"));
        assertDoesNotThrow(() -> limites.consumir("conta-b", 2));
        when(relogio.millis()).thenReturn(60_000L);
        assertDoesNotThrow(() -> limites.consumir("conta-a", 2));
    }

    @Test
    void vagaDeInferenciaFicaDisponivelDepoisDaLiberacao() {
        var limites = new LimiteRequisicoes(2, 2, 2, 2, 1, Clock.systemUTC());
        limites.iniciarInferencia();
        assertThrows(LimiteRequisicoes.Excedido.class, limites::iniciarInferencia);
        limites.liberarInferencia();
        assertDoesNotThrow(limites::iniciarInferencia);
    }
}
