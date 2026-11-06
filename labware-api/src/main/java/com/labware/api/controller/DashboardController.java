package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.labware.api.dto.response.MetricasDashboardResponse;
import com.labware.api.service.MetricasService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "Dashboard de Métricas", description = "Visão analítica e KPIs em tempo real, exclusivo de SUPORTE e ADMIN.")
@RestController
@RequestMapping("/api/metricas")
@RequiredArgsConstructor
public class DashboardController {

    private final MetricasService metricasService;

    @Operation(
            summary = "Consultar métricas analíticas e KPIs do Dashboard",
            description = "Retorna KPIs gerais, distribuição por status, prioridade, categoria/módulo, série temporal e chamados mais urgentes."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Métricas obtidas com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('SUPORTE', 'ADMIN')")
    public MetricasDashboardResponse obterDashboard(
            @Parameter(description = "Data inicial para filtro (YYYY-MM-DD)", example = "2026-10-01")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,

            @Parameter(description = "Data final para filtro (YYYY-MM-DD)", example = "2026-10-28")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,

            @Parameter(description = "ID opcional da empresa", example = "1")
            @RequestParam(required = false) Long empresaId
    ) {
        return metricasService.obterDashboard(dataInicio, dataFim, empresaId);
    }
}
