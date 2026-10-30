package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
@Schema(description = "Empresa cadastral existente e ativa; operação exclusiva de ADMIN.")
public record VincularEmpresaRequest(
        @Schema(description = "Identificador do vínculo cadastral com a empresa.", example = "1")
        @NotNull @Positive Long empresaId
) {}
