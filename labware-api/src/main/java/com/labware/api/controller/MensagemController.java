package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;


import com.labware.api.config.UsuarioLogado;
import com.labware.api.dto.request.CriarMensagemRequest;
import com.labware.api.dto.response.MensagemResponse;
import com.labware.api.service.MensagemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Mensagens", description = "Interações públicas e notas internas do suporte.")
@RestController
@RequestMapping("/api/chamados/{chamadoId}/mensagens")
@RequiredArgsConstructor

public class MensagemController {

    private final MensagemService mensagemService;

    @Operation(summary = "Enviar mensagem", description = "Solicitante CLIENTE ou SUPORTE/ADMIN. Notas internas são exclusivas do suporte. anexoId deve pertencer ao mesmo chamado. Mensagem pública do suporte registra primeira resposta para SLA.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MensagemResponse enviar(@PathVariable Long chamadoId,
                                   @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                   @Valid @RequestBody CriarMensagemRequest request) {


        return mensagemService.enviar(chamadoId, UsuarioLogado.id(jwt), request);
    }

    @Operation(summary = "Listar mensagens", description = "CLIENTE vê somente mensagens públicas dos próprios chamados; SUPORTE/ADMIN também veem notas internas. Ordenação por envio e ID.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping
    public List<MensagemResponse> listar(@PathVariable Long chamadoId,
                                         @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return mensagemService.listar(chamadoId, UsuarioLogado.id(jwt));
    }
}
