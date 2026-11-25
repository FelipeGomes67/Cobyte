package com.cobyte.api.controller;

import com.cobyte.api.service.IdentificadorChamado;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;


import com.cobyte.api.config.UsuarioLogado;
import com.cobyte.api.dto.response.AnexoResponse;
import com.cobyte.api.service.AnexoService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Tag(name = "Anexos", description = "Upload, listagem e download sujeitos ao acesso ao chamado.")
@RestController
@RequestMapping("/api/chamados")
@RequiredArgsConstructor
public class AnexoController {
    private final IdentificadorChamado identificador;
    private final AnexoService service;

    @Operation(summary = "Enviar anexo", description = "Cliente da empresa do chamado, técnico participante ou ADMIN. Arquivo multipart de até 10 MB; retorna metadados e URL de download autenticado.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "413", ref = "#/components/responses/ArquivoGrande"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping(value = "/{id}/anexos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
            description = "Envio multipart com a parte obrigatória arquivo, até 10 MB.")
    @ResponseStatus(HttpStatus.CREATED)
    public AnexoResponse enviar(@PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                @RequestParam("arquivo") MultipartFile arquivo) {
        return service.enviar(identificador.interno(id), UsuarioLogado.id(jwt), arquivo);
    }

    @Operation(summary = "Listar anexos", description = "Cliente da empresa do chamado ou SUPORTE/ADMIN. Clientes recebem apenas anexos públicos. Retorna metadados sem expor caminhos físicos.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/{id}/anexos")
    public List<AnexoResponse> listar(@PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return service.listar(identificador.interno(id), UsuarioLogado.id(jwt));
    }

    @Operation(summary = "Baixar anexo", description = "Cliente da empresa do chamado ou SUPORTE/ADMIN, conforme a visibilidade do anexo. Retorna arquivo binário com Content-Disposition attachment.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Arquivo binário", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/octet-stream", schema = @io.swagger.v3.oas.annotations.media.Schema(type = "string", format = "binary"))),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/anexos/{anexoId}/download")
    public ResponseEntity<Resource> baixar(@PathVariable Long anexoId, @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        var download = service.baixar(anexoId, UsuarioLogado.id(jwt));
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(download.tamanhoBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(download.nomeArquivo(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore()).body(download.recurso());
    }
}
