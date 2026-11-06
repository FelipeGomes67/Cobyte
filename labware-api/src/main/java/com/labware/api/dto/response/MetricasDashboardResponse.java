package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.Map;

@Schema(description = "Painel analítico consolidado de métricas e KPIs de atendimento")
public record MetricasDashboardResponse(
        @Schema(description = "Indicadores gerais e resumo de desempenho do atendimento")
        KpisGeraisResponse kpisGerais,

        @Schema(description = "Distribuição da quantidade de chamados por cada StatusChamado")
        Map<String, Long> distribuicaoPorStatus,

        @Schema(description = "Distribuição da quantidade de chamados por cada Prioridade")
        Map<String, Long> distribuicaoPorPrioridade,

        @Schema(description = "Distribuição da quantidade de chamados por categoria/módulo")
        Map<String, Long> chamadosPorModulo,

        @Schema(description = "Série temporal diária de chamados abertos vs resolvidos")
        List<TendenciaChamadoResponse> tendenciaChamados,

        @Schema(description = "Lista dos chamados mais urgentes ou com SLA em risco para ação rápida")
        List<ChamadoResponse> chamadosUrgentes
) {}
