package com.labware.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum StatusChamado {
    ABERTO, EM_ANALISE, EM_ATENDIMENTO, AGUARDANDO_CLIENTE, RESOLVIDO, FECHADO, CANCELADO;

    @JsonCreator
    public static StatusChamado deCodigo(String codigo) {
        if (codigo == null) return null;
        String valor = codigo.trim().toUpperCase(Locale.ROOT);
        return "AGUARDANDO_SOLICITANTE".equals(valor) ? AGUARDANDO_CLIENTE : valueOf(valor);
    }

    @JsonValue
    public String codigo() {
        return this == AGUARDANDO_CLIENTE ? "AGUARDANDO_SOLICITANTE" : name();
    }

    public boolean finalizado() { return this == FECHADO || this == CANCELADO; }

    public boolean podeIrPara(StatusChamado destino) {
        if (destino == null) return false;
        return switch (this) {
            case ABERTO -> destino == EM_ANALISE || destino == CANCELADO;
            case EM_ANALISE -> destino == EM_ATENDIMENTO || destino == AGUARDANDO_CLIENTE || destino == CANCELADO;
            case EM_ATENDIMENTO -> destino == RESOLVIDO || destino == AGUARDANDO_CLIENTE || destino == EM_ANALISE;
            case AGUARDANDO_CLIENTE -> destino == EM_ATENDIMENTO || destino == CANCELADO;
            case RESOLVIDO -> destino == FECHADO || destino == EM_ATENDIMENTO;
            case FECHADO, CANCELADO -> false;
        };
    }
}
