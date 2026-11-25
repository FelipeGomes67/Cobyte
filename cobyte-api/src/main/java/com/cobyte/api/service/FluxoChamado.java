package com.cobyte.api.service;

import com.cobyte.api.model.entity.Chamado;
import com.cobyte.api.model.enums.StatusChamado;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Invariantes compartilhadas por alterações manuais, fechamento e retomada pelo chat. */
final class FluxoChamado {
    private FluxoChamado() {}

    static void validarClassificacao(Chamado chamado, StatusChamado destino) {
        if (destino == StatusChamado.EM_ANALISE || destino == StatusChamado.ABERTO
                || destino == StatusChamado.CANCELADO) return;
        boolean categoriaDefinida = chamado.getCategoria() != null
                || (chamado.getCategoriaPersonalizada() != null
                    && chamado.getCategoriaPersonalizada().strip().length() >= 3);
        if (chamado.getPrioridade() == null || !categoriaDefinida) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Defina e salve a categoria e a prioridade em Em análise antes de avançar o chamado");
        }
    }
}
