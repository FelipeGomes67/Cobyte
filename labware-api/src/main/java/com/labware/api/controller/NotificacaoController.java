package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;

import com.labware.api.config.UsuarioLogado;
import com.labware.api.service.NotificacaoService;
import com.labware.api.dto.request.ConfiguracaoNotificacaoRequest;
import com.labware.api.dto.response.NotificacaoResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@Tag(name = "Notificações", description = "Alertas persistidos por usuário, consultáveis por polling.")
@RestController @RequiredArgsConstructor
public class NotificacaoController {
    private final NotificacaoService service;
    @Operation(summary = "Listar notificações", description = "Página das notificações do usuário logado, mais recentes primeiro. Não disponibiliza notificações de outros usuários.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/notificacoes")
    public com.labware.api.dto.response.PaginaResponse<NotificacaoResponse> listar(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                                                                   @RequestParam(defaultValue="0") @Min(0) int page,@RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return com.labware.api.dto.response.PaginaResponse.from(service.listar(UsuarioLogado.id(jwt),page,size));
    }
    @Operation(summary = "Contar notificações não lidas", description = "Retorna o objeto {naoLidas: quantidade} para o badge do sino.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/notificacoes/contador-nao-lidas")
    public Map<String,Long> contador(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) { return Map.of("naoLidas",service.contador(UsuarioLogado.id(jwt))); }
    @PutMapping("/api/notificacoes/{id}/lida")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    @Operation(summary = "Marcar notificação como lida", description = "Somente o destinatário autenticado pode marcar seu aviso.")
    public void marcarLida(@PathVariable Long id,@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        service.marcarLida(id,UsuarioLogado.id(jwt));
    }
    @Operation(summary = "Marcar todas as notificações como lidas", description = "Atualiza somente as notificações do usuário autenticado.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Operação concluída sem corpo", content = @io.swagger.v3.oas.annotations.media.Content),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PutMapping("/api/notificacoes/marcar-todas-lidas")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void marcar(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) { service.marcarTodas(UsuarioLogado.id(jwt)); }
    @Operation(summary = "Consultar preferências de alertas", description = "Preferências persistidas em Usuario. Chaves ausentes têm valor padrão true.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/usuarios/me/configuracoes-notificacao")
    public ConfiguracaoNotificacaoRequest preferencias(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) { return service.preferencias(UsuarioLogado.id(jwt)); }
    @Operation(summary = "Atualizar preferências de alertas", description = "Substitui novasMensagens, alteracoesStatus e atribuicoes. As três opções são obrigatórias.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PutMapping("/api/usuarios/me/configuracoes-notificacao")
    public ConfiguracaoNotificacaoRequest preferencias(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ConfiguracaoNotificacaoRequest r) {
        return service.preferencias(UsuarioLogado.id(jwt),r);
    }
}
