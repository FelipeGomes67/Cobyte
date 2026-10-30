package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
@Schema(description = "Técnico SUPORTE/ADMIN que receberá a atribuição.")
public record AtribuirChamadoRequest(
        @Schema(description = "ID de um usuário SUPORTE ou ADMIN.", example = "2")
        @NotNull @Positive Long tecnicoId
) {}
