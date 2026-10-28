package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;

import com.labware.api.config.UsuarioLogado;
import com.labware.api.dto.request.*;
import com.labware.api.dto.response.PerfilResponse;
import com.labware.api.service.PerfilService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Perfil", description = "Perfil, senha e vínculo cadastral de empresa.")
@RestController @RequiredArgsConstructor
public class PerfilController {
    private final PerfilService service;
    @Operation(summary = "Vincular empresa ao usuário", description = "SUPORTE ou ADMIN. Vincula usuário CLIENTE a uma empresa existente e ativa. O texto empresa do perfil não altera este vínculo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PutMapping("/api/usuarios/{id}/empresa")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
    public PerfilResponse vincularEmpresa(@PathVariable Long id,@Valid @RequestBody VincularEmpresaRequest r) {
        return service.vincularEmpresa(id,r);
    }
    @GetMapping("/api/usuarios")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
    @Operation(summary = "Listar clientes", description = "SUPORTE/ADMIN. Lista paginada com nome, e-mail e vínculo cadastral. Busca por nome ou e-mail.")
    public com.labware.api.dto.response.PaginaResponse<PerfilResponse> listarClientes(
            @RequestParam(required=false) @jakarta.validation.constraints.Size(max=255) String busca,
            @RequestParam(defaultValue="0") @jakarta.validation.constraints.Min(0) int page,
            @RequestParam(defaultValue="20") @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(100) int size) {
        return service.listarClientes(busca,page,size);
    }

    @PostMapping("/api/empresas")
    @ResponseStatus(HttpStatus.CREATED)
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
    @Operation(summary = "Cadastrar empresa", description = "SUPORTE/ADMIN. Cadastra empresa ativa com nome e CNPJ único.")
    public com.labware.api.dto.response.EmpresaResumoResponse cadastrarEmpresa(@Valid @RequestBody CadastrarEmpresaRequest request) {
        return service.cadastrarEmpresa(request);
    }

    @GetMapping("/api/empresas")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
    @Operation(summary = "Listar empresas ativas", description = "SUPORTE/ADMIN. Empresas cadastradas disponíveis para vínculo de clientes.")
    public java.util.List<com.labware.api.dto.response.EmpresaResumoResponse> empresas() {
        return service.listarEmpresas();
    }

    @Operation(summary = "Cadastrar cliente", description = "Público. Cria perfil CLIENTE com senha BCrypt. É necessário vínculo cadastral com Empresa antes de abrir chamados.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping("/api/auth/cadastrar") @ResponseStatus(HttpStatus.CREATED)
    public PerfilResponse cadastrar(@Valid @RequestBody CadastroRequest r) { return service.cadastrar(r); }
    @Operation(summary = "Consultar perfil", description = "Retorna nome, e-mail, cargo, empresa informativa, empresaId cadastral e perfil do usuário logado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/api/usuarios/me")
    public PerfilResponse me(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) { return service.buscar(UsuarioLogado.id(jwt)); }
    @Operation(summary = "Atualizar perfil", description = "Atualiza nome, e-mail, cargo e texto informativo da empresa. Não permite alterar perfil ou empresaId.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflito"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PutMapping("/api/usuarios/me")
    public PerfilResponse atualizar(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,@Valid @RequestBody AtualizarPerfilRequest r) {
        return service.atualizar(UsuarioLogado.id(jwt),r);
    }
    @Operation(summary = "Alterar senha", description = "Valida senhaAtual com PasswordEncoder e grava novaSenha. JWTs emitidos permanecem válidos até expirar.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Operação concluída sem corpo", content = @io.swagger.v3.oas.annotations.media.Content),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @RequestMapping(value = "/api/usuarios/me/senha", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void senha(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,@Valid @RequestBody AlterarSenhaRequest r) {
        service.senha(UsuarioLogado.id(jwt),r);
    }

    @Operation(summary = "Enviar foto de perfil", description = "Upload de imagem (JPEG, PNG, WEBP) para o perfil do usuário logado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Foto de perfil atualizada"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "413", ref = "#/components/responses/ArquivoGrande"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping(value = "/api/usuarios/me/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PerfilResponse uploadFoto(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
                                     @RequestParam("foto") MultipartFile foto) {
        return service.salvarFoto(UsuarioLogado.id(jwt), foto);
    }

    @Operation(summary = "Remover foto de perfil", description = "Remove a foto de perfil do usuário logado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Foto de perfil removida"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @DeleteMapping("/api/usuarios/me/foto")
    public PerfilResponse removerFoto(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return service.removerFoto(UsuarioLogado.id(jwt));
    }

    @Operation(summary = "Visualizar foto de perfil", description = "Retorna o arquivo binário da imagem de perfil do usuário.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Imagem de perfil"),
            @ApiResponse(responseCode = "404", ref = "#/components/responses/NaoEncontrado")
    })
    @GetMapping("/api/usuarios/{id}/foto")
    public ResponseEntity<Resource> foto(@PathVariable Long id) {
        var foto = service.carregarFoto(id);
        return ResponseEntity.ok()
                .contentType(foto.mediaType())
                .cacheControl(CacheControl.noCache())
                .body(foto.recurso());
    }
}