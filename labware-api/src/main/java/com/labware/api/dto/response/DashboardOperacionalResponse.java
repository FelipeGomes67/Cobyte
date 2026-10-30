package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Map;
@Schema(description = "Indicadores globais e até 10 chamados ativos atribuídos ao suporte logado.")
public record DashboardOperacionalResponse(
        @Schema(description = "Chamados críticos ainda ativos.", example = "3")
        long incidentesCriticosCount,
        @Schema(description = "Chamados ativos com SLA consumido em pelo menos 80%, ainda não vencido.", example = "2")
        long slasEmRiscoCount,
        @Schema(description = "Registros de histórico nas últimas 24 horas.", example = "8")
        long atividadesRecentesCount,
        @Schema(description = "Contagem global por prioridade, incluindo SEM_CLASSIFICACAO.")
        Map<String,Long> distribuicaoPorPrioridade,
        @Schema(description = "Até 10 chamados ativos do responsável logado por prioridade e prazo.")
        List<ChamadoResponse> chamadosPrioritarios
) {}
