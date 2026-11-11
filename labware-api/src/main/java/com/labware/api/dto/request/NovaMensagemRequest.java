package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Requisição para envio de nova mensagem no chamado.")
public record NovaMensagemRequest(
        @Schema(description = "Texto da mensagem.", example = "Olá, gostaria de saber o status da correção.")
        @NotBlank String texto
) {}

