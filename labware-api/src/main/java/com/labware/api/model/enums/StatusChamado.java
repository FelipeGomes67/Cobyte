package com.labware.api.model.enums;

public enum StatusChamado {
    ABERTO, EM_ANALISE, EM_ATENDIMENTO, AGUARDANDO_CLIENTE, RESOLVIDO, FECHADO;

    public boolean podeIrPara(StatusChamado destino) {
        return switch (this) {
            case ABERTO -> destino == EM_ANALISE;
            case EM_ANALISE -> destino == EM_ATENDIMENTO || destino == AGUARDANDO_CLIENTE;
            case EM_ATENDIMENTO -> destino == AGUARDANDO_CLIENTE || destino == RESOLVIDO;
            case AGUARDANDO_CLIENTE -> destino == EM_ATENDIMENTO || destino == RESOLVIDO;
            case RESOLVIDO -> destino == FECHADO || destino == EM_ATENDIMENTO;
            case FECHADO -> false;
        };
    }
}