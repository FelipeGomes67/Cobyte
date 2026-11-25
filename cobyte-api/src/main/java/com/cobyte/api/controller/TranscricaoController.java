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
import com.cobyte.api.dto.response.TranscricaoResponse;
import com.cobyte.api.service.TranscricaoChamadoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Transcrição local (STT)", description = "Áudio processado pelo microsserviço local faster-whisper em português.")
@RestController
@RequestMapping("/api/chamados")
@RequiredArgsConstructor
public class TranscricaoController {
    private final IdentificadorChamado identificador;
    private final TranscricaoChamadoService service;
    private final com.cobyte.api.service.TranscricaoService transcricao;

    @Operation(summary = "Transcrever áudio antes da abertura", description = "Usuário autenticado. Prévia sem persistência nem chamado existente. Envie arquivo multipart WAV, MP3, OGG, M4A ou FLAC, até 10 MB. Retorna texto e duração.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "413", ref = "#/components/responses/ArquivoGrande"),
            @ApiResponse(responseCode = "415", ref = "#/components/responses/TipoInvalido"),
            @ApiResponse(responseCode = "422", ref = "#/components/responses/AudioInvalido"),
            @ApiResponse(responseCode = "502", ref = "#/components/responses/ServicoIndisponivel"),
            @ApiResponse(responseCode = "503", ref = "#/components/responses/ServicoIndisponivel"),
            @ApiResponse(responseCode = "504", ref = "#/components/responses/ServicoIndisponivel"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping(value = "/transcrever-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
            description = "Envio multipart com a parte obrigatória arquivo.")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('CLIENTE','SUPORTE','ADMIN')")
    public TranscricaoResponse previa(@Parameter(description = "Áudio WAV, MP3, OGG, M4A ou FLAC, até 10 MB.")
                                      @RequestParam("arquivo") MultipartFile arquivo) {
        return transcricao.transcreverAudio(arquivo);
    }

    @Operation(summary = "Transcrever áudio de um chamado", description = "Cliente da empresa do chamado, técnico participante ou ADMIN, conforme as permissões de envio. Pode salvar anexo e/ou mensagem. Nota interna exige SUPORTE/ADMIN, salvarMensagem=true e salvarAnexo=false. Chamado fechado não aceita nova mensagem.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "413", ref = "#/components/responses/ArquivoGrande"),
            @ApiResponse(responseCode = "415", ref = "#/components/responses/TipoInvalido"),
            @ApiResponse(responseCode = "422", ref = "#/components/responses/AudioInvalido"),
            @ApiResponse(responseCode = "502", ref = "#/components/responses/ServicoIndisponivel"),
            @ApiResponse(responseCode = "503", ref = "#/components/responses/ServicoIndisponivel"),
            @ApiResponse(responseCode = "504", ref = "#/components/responses/ServicoIndisponivel"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping(value = "/{id}/transcrever-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
            description = "Envio multipart com a parte obrigatória arquivo. Opções de persistência são parâmetros de consulta.")
    public TranscricaoResponse transcrever(@PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                           @Parameter(description = "Áudio WAV, MP3, OGG, M4A ou FLAC, até 10 MB.")
                                           @RequestParam("arquivo") MultipartFile arquivo,
                                           @Parameter(description = "Armazena o áudio como anexo visível aos usuários com acesso ao chamado.")
                                           @RequestParam(defaultValue = "false") boolean salvarAnexo,
                                           @Parameter(description = "Persiste a transcrição como mensagem AUDIO; vincula anexo quando ambos são salvos.")
                                           @RequestParam(defaultValue = "false") boolean salvarMensagem,
                                           @Parameter(description = "Nota interna: exige SUPORTE/ADMIN, salvarMensagem=true e salvarAnexo=false.")
                                           @RequestParam(defaultValue = "false") boolean visivelApenasSuporte) {
        return service.transcrever(identificador.interno(id), UsuarioLogado.id(jwt), arquivo, salvarAnexo, salvarMensagem, visivelApenasSuporte);
    }
}
