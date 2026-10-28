package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Abertura por CLIENTE vinculado a Empresa; descrição pode vir da prévia STT.")
public record AbrirChamadoRequest(
        @Schema(description = "Título do chamado.", example = "Falha no acesso ao sistema")
        @NotBlank @Size(max = 255) String titulo,
        @Schema(description = "Relato detalhado, digitado ou obtido por STT.", example = "Não consigo acessar o módulo de resultados.")
        @NotBlank String descricao,
        @Schema(description = "Origem persistida TEXTO/VOZ; o request também aceita PORTAL_TEXTO/AUDIO_VOZ.", example = "TEXTO", allowableValues = {"TEXTO", "VOZ", "PORTAL_TEXTO", "AUDIO_VOZ"})
        com.labware.api.model.enums.OrigemChamado origem,
        @Schema(description = "Duração do áudio em segundos; null quando não disponível.", example = "12.5")
        @jakarta.validation.constraints.PositiveOrZero Double duracaoAudioSegundos
) {
    public AbrirChamadoRequest(String titulo, String descricao) {
        this(titulo, descricao, null, null);
    }
    public AbrirChamadoRequest(String titulo, String descricao, String equipamentoModulo, com.labware.api.model.enums.OrigemChamado origem, Double duracaoAudioSegundos) {
        this(titulo, descricao, origem, duracaoAudioSegundos);
    }
}