package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;

import com.labware.api.config.UsuarioLogado;
import com.labware.api.dto.response.*;
import com.labware.api.service.RelatorioService;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@Tag(name = "Relatórios e dashboard", description = "Indicadores gerenciais exclusivos de SUPORTE/ADMIN.")
@RestController @RequiredArgsConstructor @PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
public class RelatorioController {
    private final RelatorioService service;
    @Operation(summary = "Consultar dashboard operacional", description = "Críticos ativos, SLAs em risco (80% do prazo ainda não vencido), histórico das últimas 24h, distribuição global e até 10 chamados ativos do responsável logado ordenados por prioridade/prazo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/dashboard/metricas")
    public DashboardOperacionalResponse dashboard(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) { return service.dashboard(UsuarioLogado.id(jwt)); }
    @Operation(summary = "Consultar KPIs", description = "Todo o período disponível. Média CSAT, média da primeira resposta em minutos corridos e percentual de SLA de resolução cumprido entre resolvidos com prazo. Sem amostras retorna null. Inclui denominadores.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/relatorios/kpis") public KpisResponse kpis() { return service.kpis(); }
    @Operation(summary = "Agrupar chamados por categoria", description = "Inclui todos os chamados, categorias com zero e SEM_CLASSIFICACAO.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/relatorios/por-categoria") public List<GrupoContagemResponse> categorias() { return service.categorias(); }
    @Operation(summary = "Agrupar chamados por prioridade", description = "Inclui todos os chamados, prioridades com zero e SEM_CLASSIFICACAO.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/relatorios/por-prioridade") public List<GrupoContagemResponse> prioridades() { return service.prioridades(); }
    @Operation(summary = "Consultar evolução mensal", description = "Retorna os 12 meses do ano, preenchendo zeros. Abertos pela data de abertura; resolvidos pela data de resolução atual.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/relatorios/evolucao-mensal")
    public List<EvolucaoMensalResponse> evolucao(@RequestParam @Min(1900) @Max(9998) int ano) { return service.evolucao(ano); }
}
