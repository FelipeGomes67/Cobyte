package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
@Schema(description = "Senha atual e nova senha. A nova senha admite de 8 a 72 caracteres e até 72 bytes UTF-8.")
public record AlterarSenhaRequest(
        @Schema(description = "Senha atual para confirmar a alteração.", format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank String senhaAtual,
        @Schema(description = "Nova senha: 8 a 72 caracteres e até 72 bytes UTF-8.", format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank @Size(min=8,max=72) String novaSenha
) {}
