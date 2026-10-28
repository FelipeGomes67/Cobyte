package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Credenciais para emissão do JWT.")
public record LoginRequest(
        @Schema(description = "E-mail do usuário, único sem distinção de caixa.", example = "maria@exemplo.com")
        @NotBlank @Email String email,
        @Schema(description = "Senha em texto apenas na requisição; armazenada com BCrypt.", format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank String senha
) {}