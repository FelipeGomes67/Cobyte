package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Indicadores gerais e KPIs consolidados do suporte")
public record KpisGeraisResponse(
        @Schema(description = "Total de chamados no período selecionado", example = "120")
        Long totalChamados,

        @Schema(description = "Quantidade de chamados com status ABERTO", example = "15")
        Long chamadosAbertos,

        @Schema(description = "Quantidade de chamados em andamento (EM_ANALISE / EM_ATENDIMENTO)", example = "28")
        Long chamadosEmAndamento,

        @Schema(description = "Quantidade de chamados aguardando cliente", example = "7")
        Long chamadosAguardandoCliente,

        @Schema(description = "Quantidade de chamados resolvidos ou fechados", example = "70")
        Long chamadosResolvidos,

        @Schema(description = "Percentual de cumprimento de SLA (%)", example = "94.5")
        Double taxaCumprimentoSla,

        @Schema(description = "Tempo médio até a primeira resposta em minutos", example = "42")
        Long tempoMedioPrimeiraRespostaMinutos,

        @Schema(description = "Tempo médio para resolução em horas", example = "18.5")
        Double tempoMedioResolucaoHoras,

        @Schema(description = "Quantidade de chamados com SLA em risco de estouro (< 1h)", example = "3")
        Long chamadosSlaEmRisco
) {
    public Long totalChamadosAtivos() {
        return (chamadosAbertos != null ? chamadosAbertos : 0L)
                + (chamadosEmAndamento != null ? chamadosEmAndamento : 0L)
                + (chamadosAguardandoCliente != null ? chamadosAguardandoCliente : 0L);
    }
}
