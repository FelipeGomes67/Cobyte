package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
@Schema(description = "Um dos 12 meses do ano consultado; datas de abertura e resolução atuais.")
public record EvolucaoMensalResponse(
        @Schema(description = "Mês numérico de 1 a 12.", example = "1", minimum = "1", maximum = "12")
        int mes,
        @Schema(description = "Quantidade de chamados abertos no escopo consultado.", example = "5")
        long abertos,
        @Schema(description = "Quantidade de chamados resolvidos no escopo consultado.", example = "3")
        long resolvidos
) {}
