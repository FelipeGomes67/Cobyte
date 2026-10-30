package com.labware.api.model.enums;

public enum Prioridade {
    CRITICA(120), ALTA(240), MEDIA(720), BAIXA(2880), MELHORIA(null);

    private final Integer minutosResolucao;
    Prioridade(Integer minutosResolucao) { this.minutosResolucao = minutosResolucao; }
    public Integer minutosResolucao() { return minutosResolucao; }
}
