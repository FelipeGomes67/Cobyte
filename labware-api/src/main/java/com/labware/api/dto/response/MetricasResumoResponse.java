package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Contagens globais de chamados, restritas a SUPORTE/ADMIN.")
public record MetricasResumoResponse(
        @Schema(description = "Total.")
        long total,
        @Schema(description = "Quantidade de chamados abertos no escopo consultado.", example = "5")
        long abertos,
        @Schema(description = "Em analise.")
        long emAnalise,
        @Schema(description = "Em atendimento.")
        long emAtendimento,
        @Schema(description = "Aguardando cliente.")
        long aguardandoCliente,
        @Schema(description = "Quantidade de chamados resolvidos no escopo consultado.", example = "3")
        long resolvidos,
        @Schema(description = "Fechados.")
        long fechados,
        @Schema(description = "Resolvidos fora do prazo.")
        long resolvidosForaDoPrazo,
        @Schema(description = "Incidentes criticos.")
        long incidentesCriticos,
        @Schema(description = "Slas em risco.")
        long slasEmRisco
) {}
