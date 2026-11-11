package com.labware.api.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.labware.api.model.enums.Prioridade;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Requisição para alteração da prioridade do chamado por suporte/admin.")
public record AlterarPrioridadeRequest(
        @Schema(description = "Nova prioridade do chamado.", example = "ALTA")
        @NotNull(message = "O campo novaPrioridade é obrigatório")
        @JsonAlias("prioridade")
        Prioridade novaPrioridade
) {}

