package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Ponto diário de tendência com volume de chamados abertos vs resolvidos")
public record TendenciaChamadoResponse(
        @Schema(description = "Data de referência (YYYY-MM-DD)", example = "2026-10-25")
        String data,

        @Schema(description = "Quantidade de chamados criados na data", example = "8")
        Long abertos,

        @Schema(description = "Quantidade de chamados resolvidos na data", example = "6")
        Long resolvidos
) {}
