package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;

import com.labware.api.config.UsuarioLogado;
import com.labware.api.service.LeituraChamadoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@Tag(name = "Mensagens", description = "Leitura individual das interações.")
@RestController @RequiredArgsConstructor
public class LeituraChamadoController {
    private final LeituraChamadoService service;
    @Operation(summary = "Marcar mensagens como lidas", description = "Solicitante CLIENTE ou SUPORTE/ADMIN. Avança o marcador individual até a última mensagem visível. Notas internas não entram no marcador do cliente.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Operação concluída sem corpo", content = @io.swagger.v3.oas.annotations.media.Content),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PutMapping("/api/chamados/{id}/mensagens/marcar-lidas")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void marcar(@PathVariable Long id,@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) { service.marcar(id,UsuarioLogado.id(jwt)); }
}
