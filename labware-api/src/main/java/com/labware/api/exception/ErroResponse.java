package com.labware.api.exception;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "Contrato padronizado de erro da API.")
public record ErroResponse(
        @Schema(description = "Instante do erro em UTC.")
        Instant timestamp,
        @Schema(description = "Código HTTP do erro", example = "400")
        int status,
        @Schema(description = "Descrição HTTP do erro.", example = "Bad Request")
        String erro,
        @Schema(description = "Mensagem.")
        String mensagem,
        @Schema(description = "Caminho HTTP da requisição.", example = "/api/chamados")
        String caminho,
        @Schema(description = "Detalhes de validação; lista vazia para outros erros.")
        List<CampoInvalido> campos
) {

    @Schema(description = "Campo rejeitado na validação do corpo da requisição.")
    public record CampoInvalido(
            @Schema(description = "Nome do campo inválido.", example = "notaAvaliacao")
            String campo,
            @Schema(description = "Motivo da rejeição do campo.")
            String mensagem
    ) {}
}
