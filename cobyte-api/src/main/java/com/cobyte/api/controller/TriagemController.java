package com.cobyte.api.controller;

import com.cobyte.api.service.IdentificadorChamado;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;

import com.cobyte.api.dto.response.TriagemResponse;
import com.cobyte.api.service.TriagemService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
@Tag(name = "Triagem IA", description = "Sugestões de classificação, separadas das decisões finais humanas.")
@RestController @RequiredArgsConstructor @PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
public class TriagemController {
    private final IdentificadorChamado identificador;
    private final TriagemService service;
    @Operation(summary = "Executar novamente a triagem", description = "SUPORTE/ADMIN, chamado ativo. Executa triagem enriquecida, parcial ou por regras locais dentro do prazo configurado. Atualiza sugestões e recalcula SLA quando a classificação anterior era fallback. Técnico sugerido permanece null.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "503", ref = "#/components/responses/ServicoIndisponivel"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping("/api/chamados/{id}/reclassificar-ia")
    public TriagemResponse reclassificar(@PathVariable UUID id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt) {
        return service.reclassificar(identificador.interno(id), com.cobyte.api.config.UsuarioLogado.id(jwt));
    }
    @Operation(summary = "Consultar classificação IA", description = "SUPORTE/ADMIN. Retorna título, categoria, prioridade, justificativa e meta SLA sugeridos; 404 se ainda não houver classificação.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/chamados/{id}/classificacao-ia")
    public TriagemResponse buscar(@PathVariable UUID id) { return service.buscar(identificador.interno(id)); }
}
