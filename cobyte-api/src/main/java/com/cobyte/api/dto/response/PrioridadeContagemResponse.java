package com.cobyte.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import com.cobyte.api.model.enums.Prioridade;

@Schema(description = "Quantidade de chamados para uma prioridade.")
public record PrioridadeContagemResponse(
        @Schema(description = "Prioridade.")
        Prioridade prioridade,
        @Schema(description = "Quantidade de chamados no grupo.", example = "5")
        long quantidade
) {}
