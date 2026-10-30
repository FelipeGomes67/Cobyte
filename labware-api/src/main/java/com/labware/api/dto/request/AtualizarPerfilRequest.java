package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Dados editáveis do próprio perfil. Somente CLIENTE pode escolher empresaId.")
public record AtualizarPerfilRequest(
        @Schema(description = "Nome do usuário.", example = "Maria Silva")
        @NotBlank @Size(max=255) String nome,
        @Schema(description = "E-mail do usuário, único sem distinção de caixa.", example = "maria@exemplo.com")
        @NotBlank @Email @Size(max=255) String email,
        @Schema(description = "Cargo informado no perfil; opcional.", example = "Analista")
        @Size(max=80) String cargo,
        @Schema(description = "CLIENTE: identificador de empresa existente e ativa. Ausente ou nulo mantém o vínculo atual.", example = "1")
        @Positive Long empresaId,
        @Schema(description = "Telefone de contato; opcional.", example = "(11) 98765-4321")
        @Size(max=30) String telefone,
        @Schema(description = "Foto ou avatar do perfil; opcional.")
        @Size(max=500) String fotoPerfil
) {}
