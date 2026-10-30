package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
@Schema(description = "KPIs de todo o período; médias e percentual são null quando não há amostras.")
public record KpisResponse(
        @Schema(description = "Média das notas existentes; null sem avaliações.", example = "4.3", nullable = true)
        Double avaliacaoMedia,
        @Schema(description = "Média em minutos corridos dos chamados respondidos; null sem amostras.", example = "12.0", nullable = true)
        Double tempoMedioPrimeiraRespostaMinutos,
        @Schema(description = "Percentual de resolvidos com prazo cuja resolução ocorreu até o limite; null sem amostras.", example = "100.0", nullable = true)
        Double percentualSlasCumpridos,
        @Schema(description = "Quantidade de avaliações incluídas na média.", example = "10")
        long atendimentosAvaliados,
        @Schema(description = "Denominador da média de primeira resposta.", example = "15")
        long chamadosComPrimeiraResposta,
        @Schema(description = "Denominador do percentual de SLA de resolução.", example = "12")
        long chamadosResolvidosComPrazo
) {}
