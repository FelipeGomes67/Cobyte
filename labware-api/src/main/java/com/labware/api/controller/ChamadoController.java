package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;


import com.labware.api.config.UsuarioLogado;
import com.labware.api.dto.response.ChamadoResponse;
import com.labware.api.dto.request.AbrirChamadoRequest;
import com.labware.api.dto.request.AlterarPrioridadeRequest;
import com.labware.api.dto.request.AlterarStatusRequest;
import com.labware.api.dto.request.AvaliacaoChamadoRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import com.labware.api.service.ChamadoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Chamados", description = "Abertura, busca, atendimento e avaliação de chamados.")
@RestController
@RequestMapping("/api/chamados")
@RequiredArgsConstructor

public class ChamadoController {

    private final ChamadoService chamadoService;

    @Operation(summary = "Avaliar atendimento (CSAT)", description = "Somente CLIENTE solicitante; status RESOLVIDO ou FECHADO; nota de 1 a 5 e avaliação única. Fecha automaticamente um chamado RESOLVIDO. /avaliar é alias legado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping({"/{id}/avaliar", "/{id}/avaliacao"})
    @PreAuthorize("hasRole('CLIENTE')")
    public ChamadoResponse avaliar(@PathVariable Long id,
                                   @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                   @Valid @RequestBody AvaliacaoChamadoRequest dto) {
        return chamadoService.avaliarChamado(id, dto, UsuarioLogado.id(jwt));
    }

    @Operation(summary = "Abrir chamado", description = "Somente CLIENTE vinculado a Empresa. Exige multipart com a parte chamado (JSON) e ao menos um arquivo na parte arquivos. JSON sem anexos retorna 400. Aceita texto ou relato transcrito e duração. Classifica com IA e aplica SLA; em falha da IA usa prioridade MEDIA.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ChamadoResponse abrir(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                 @Valid @RequestBody AbrirChamadoRequest request) {
        return chamadoService.abrir(UsuarioLogado.id(jwt), request);
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Abrir chamado com anexos", description = "Parte chamado: JSON; partes arquivos: imagens ou documentos obrigatórios. A IA recebe somente título e descrição.")
    public ChamadoResponse abrirComAnexos(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                          @Valid @RequestPart("chamado") AbrirChamadoRequest request,
                                          @RequestPart(value = "arquivos", required = false) List<org.springframework.web.multipart.MultipartFile> arquivos,
                                          @RequestPart(value = "audio", required = false) org.springframework.web.multipart.MultipartFile audio) {
        return chamadoService.abrir(UsuarioLogado.id(jwt), request, arquivos, audio);
    }

    /** CLIENTE: só os próprios (o filtro é ignorado). SUPORTE/ADMIN: todos, com filtro opcional. */
    @Operation(summary = "Listar chamados com filtros", description = "Página com content e metadados. CLIENTE vê somente seus chamados. SUPORTE/ADMIN combinam os filtros; apenasMeus restringe ao próprio responsável. Ordenação por abertura e ID decrescentes.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping({"", "/meus"})
    public com.labware.api.dto.response.PaginaResponse<ChamadoResponse> listar(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                                                               @Parameter(description = "Filtro por solicitante, aplicado somente para SUPORTE/ADMIN.", example = "1")
                                                                               @RequestParam(required=false) Long solicitanteId,
                                                                               @Parameter(description = "Título, protocolo ou ID numérico com # opcional. Em URL, codifique # como %23.", example = "#108")
                                                                               @RequestParam(required=false) @jakarta.validation.constraints.Size(max=255) String busca,
                                                                               @RequestParam(required=false) com.labware.api.model.enums.StatusChamado status,
                                                                               @RequestParam(required=false) com.labware.api.model.enums.Prioridade prioridade,
                                                                               @Parameter(description = "Origem do chamado; aceita nomes antigos e aliases do frontend.",
                                                                                       schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"TEXTO", "VOZ", "PORTAL_TEXTO", "AUDIO_VOZ"}))
                                                                               @RequestParam(required=false) String origem,
                                                                               @Parameter(description = "ID do técnico responsável.", example = "2")
                                                                               @RequestParam(required=false) Long responsavelId,
                                                                               @Parameter(description = "Para suporte, restringe aos chamados atribuídos a si. CLIENTE sempre vê somente seus chamados.")
                                                                               @RequestParam(defaultValue="false") boolean apenasMeus,
                                                                               @RequestParam(defaultValue="0") @jakarta.validation.constraints.Min(0) int page,
                                                                               @RequestParam(defaultValue="20") @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(100) int size) {
        com.labware.api.model.enums.OrigemChamado origemEnum=null;
        if(origem!=null) try { origemEnum=com.labware.api.model.enums.OrigemChamado.parse(origem); }
        catch(IllegalArgumentException e) { throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Origem inválida"); }
        return com.labware.api.dto.response.PaginaResponse.from(chamadoService.filtrar(UsuarioLogado.id(jwt),busca,status,prioridade,origemEnum,responsavelId,apenasMeus,solicitanteId,page,size));
    }

    @Operation(summary = "Consultar chamado", description = "Solicitante CLIENTE ou SUPORTE/ADMIN. Inclui avaliação, SLA, responsável e flag de mensagens não lidas. Não marca mensagens como lidas.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/{id}")
    public ChamadoResponse buscar(@PathVariable Long id, @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return chamadoService.buscar(id, UsuarioLogado.id(jwt));
    }

    @Operation(summary = "Assumir chamado", description = "SUPORTE/ADMIN. Atribui ao usuário logado e muda para EM_ATENDIMENTO. Outro responsável gera conflito, exceto para ADMIN. PATCH é alias legado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @RequestMapping(value="/{id}/assumir",method={RequestMethod.PATCH,RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
    public ChamadoResponse assumir(@PathVariable Long id, @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {

        return chamadoService.assumir(id, UsuarioLogado.id(jwt));
    }

    @Operation(summary = "Alterar status", description = "Somente responsável SUPORTE ou ADMIN. Exige chamado atribuído e transição permitida pelo fluxo. Body: novoStatus.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PatchMapping("/{id}/status")
    public ChamadoResponse alterarStatus(@PathVariable Long id,
                                         @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                         @Valid @RequestBody AlterarStatusRequest request) {

        return chamadoService.alterarStatus(id, UsuarioLogado.id(jwt), request);
    }

    @Operation(summary = "Alterar prioridade", description = "Somente SUPORTE ou ADMIN. Atualiza a prioridade, recalcula o prazo de resolução e registra no histórico.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PatchMapping("/{id}/prioridade")
    @PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
    public ChamadoResponse alterarPrioridade(@PathVariable Long id,
                                            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                            @Valid @RequestBody AlterarPrioridadeRequest request) {

        return chamadoService.alterarPrioridade(id, UsuarioLogado.id(jwt), request);
    }

    @Operation(summary = "Atribuir técnico", description = "SUPORTE/ADMIN. tecnicoId deve identificar SUPORTE ou ADMIN. Não aceita chamado encerrado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PutMapping("/{id}/atribuir") @PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
    public ChamadoResponse atribuir(@PathVariable Long id,@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                    @Valid @RequestBody com.labware.api.dto.request.AtribuirChamadoRequest r) {

        return chamadoService.atribuir(id,UsuarioLogado.id(jwt),r.tecnicoId());
    }
    @Operation(summary = "Reabrir chamado", description = "Solicitante CLIENTE ou SUPORTE/ADMIN. Aceita RESOLVIDO/FECHADO e muda para EM_ATENDIMENTO. Limpa resolução; preserva avaliação, responsável e prazos originais.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping("/{id}/reabrir")
    public ChamadoResponse reabrir(@PathVariable Long id,@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return chamadoService.reabrir(id,UsuarioLogado.id(jwt));
    }
}
