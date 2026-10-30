package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
@Schema(description = "Cadastro público. O perfil será CLIENTE; após o login, o próprio cliente pode escolher uma empresa ativa em PUT /api/usuarios/me, junto com os demais dados do perfil.")
public record CadastroRequest(
        @Schema(description = "Nome do usuário.", example = "Maria Silva")
        @NotBlank @Size(max=255) String nome,
        @Schema(description = "E-mail do usuário, único sem distinção de caixa.", example = "maria@exemplo.com")
        @NotBlank @Email @Size(max=255) String email,
        @Schema(description = "Senha em texto apenas na requisição; armazenada com BCrypt.", format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank @Size(min=8,max=72) String senha
) {}
