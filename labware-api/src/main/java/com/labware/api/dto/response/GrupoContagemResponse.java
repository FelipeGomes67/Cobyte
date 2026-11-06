package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
@Schema(description = "Agrupamento incluindo categorias/prioridades zeradas e SEM_CLASSIFICACAO.")
public record GrupoContagemResponse(
        @Schema(description = "Nome da categoria/prioridade ou SEM_CLASSIFICACAO.", example = "ALTA")
        String grupo,
        @Schema(description = "Quantidade de chamados no grupo.", example = "5")
        long quantidade
) {}
