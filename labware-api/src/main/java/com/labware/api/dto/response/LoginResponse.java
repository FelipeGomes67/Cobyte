package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "JWT e identidade autenticada. Cole o campo token no Authorize do Swagger UI.")
public record LoginResponse(
        @Schema(description = "Token JWT de acesso, sem o prefixo Bearer.")
        String token,
        @Schema(description = "Tipo do recurso ou da autenticação, conforme o contrato.")
        String tipo,
        @Schema(description = "Instante de expiração do token JWT em UTC.")
        Instant expiraEm,
        @Schema(description = "Usuário autenticado ou nome do autor, conforme o contrato.")
        UsuarioResumoResponse usuario
) {}