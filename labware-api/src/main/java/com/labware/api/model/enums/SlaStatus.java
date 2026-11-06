package com.labware.api.model.enums;

import java.time.Duration;
import java.time.LocalDateTime;

/** Situação de um prazo de SLA. Derivada dos prazos e das datas reais, nunca gravada no banco. */
public enum SlaStatus {
    NAO_APLICAVEL,
    SEM_PRAZO,   // prazo ainda não calculado
    NO_PRAZO,    // em andamento, dentro do prazo
    EM_RISCO,    // em andamento, com 80% ou mais do prazo consumido
    CUMPRIDO,    // concluído dentro do prazo
    VIOLADO;     // concluído fora do prazo, ou em andamento e já vencido

    private static final int PERCENTUAL_RISCO = 80;

    public static SlaStatus calcular(LocalDateTime abertoEm, LocalDateTime prazo,
                                     LocalDateTime concluidoEm, LocalDateTime agora) {
        if (prazo == null) return SEM_PRAZO;

        if (concluidoEm != null) {
            return concluidoEm.isAfter(prazo) ? VIOLADO : CUMPRIDO;
        }
        if (agora.isAfter(prazo)) return VIOLADO;
        if (abertoEm == null) return NO_PRAZO;

        long total = Duration.between(abertoEm, prazo).toSeconds();
        long decorrido = Duration.between(abertoEm, agora).toSeconds();
        return total > 0 && decorrido * 100 >= total * PERCENTUAL_RISCO ? EM_RISCO : NO_PRAZO;
    }

    public boolean violado() {
        return this == VIOLADO;
    }
}