package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import com.labware.api.model.enums.StatusChamado;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Transição de status sujeita ao fluxo e à autorização do responsável.")
public record AlterarStatusRequest(
        @Schema(description = "Novo status permitido pelo fluxo do chamado.", example = "EM_ATENDIMENTO")
        @NotNull(message = "O campo novoStatus é obrigatório") StatusChamado novoStatus
) {}
