package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Resumo e distribuição por prioridade do endpoint de métricas existente.")
public record DashboardResponse(
        @Schema(description = "Resumo.")
        MetricasResumoResponse resumo,
        @Schema(description = "Por prioridade.")
        List<PrioridadeContagemResponse> porPrioridade,
        @Schema(description = "Sem classificacao.")
        long semClassificacao
) {}
