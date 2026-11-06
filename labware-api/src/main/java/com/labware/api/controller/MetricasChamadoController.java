package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;


import com.labware.api.config.UsuarioLogado;
import com.labware.api.dto.response.DashboardResponse;
import com.labware.api.dto.response.MetricasResumoResponse;
import com.labware.api.service.MetricasChamadoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Métricas de chamados", description = "Contagens existentes, exclusivas de SUPORTE/ADMIN.")
@RestController
@RequestMapping("/api/chamados/metricas")
@RequiredArgsConstructor
public class MetricasChamadoController {
    private final MetricasChamadoService service;

    @Operation(summary = "Consultar resumo dos chamados", description = "Contagens por status, resolvidos fora do prazo, críticos ativos e SLAs em risco.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/resumo")
    public MetricasResumoResponse resumo(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return service.resumo(UsuarioLogado.id(jwt));
    }

    @Operation(summary = "Consultar distribuição e resumo", description = "Resumo e contagens por prioridade, incluindo sem classificação. Para o dashboard operacional completo use /api/dashboard/metricas.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/dashboard")
    public DashboardResponse dashboard(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return service.dashboard(UsuarioLogado.id(jwt));
    }
}
