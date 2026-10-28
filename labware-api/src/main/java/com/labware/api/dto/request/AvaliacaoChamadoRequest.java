package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "CSAT único do solicitante. Aceita também os aliases avaliacaoNota e avaliacaoComentario.")
public record AvaliacaoChamadoRequest(
        @Schema(description = "Nota inteira de 1 a 5. Request aceita também avaliacaoNota.", example = "5")
        @NotNull(message = "A nota é obrigatória")
        @Min(value = 1, message = "A nota deve ser entre 1 e 5")
        @Max(value = 5, message = "A nota deve ser entre 1 e 5")
        @com.fasterxml.jackson.annotation.JsonAlias("avaliacaoNota") Integer notaAvaliacao,
        @Schema(description = "Comentário opcional, até 500 caracteres. Request aceita também avaliacaoComentario.", example = "Atendimento rápido.")
        @Size(max = 500, message = "O comentário deve ter no máximo 500 caracteres")
        @com.fasterxml.jackson.annotation.JsonAlias("avaliacaoComentario") String comentarioAvaliacao
) {}
