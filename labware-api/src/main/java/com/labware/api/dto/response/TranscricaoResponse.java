package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Resultado STT local em português. Probabilidade do idioma não mede precisão da transcrição.")
public record TranscricaoResponse(
        @Schema(description = "Nome sanitizado do arquivo.", example = "relato.wav")
        String nomeArquivo,
        @Schema(description = "Duração processada pelo STT, em segundos.", example = "12.5")
        Double duracaoSegundos,
        @Schema(description = "Idioma fixo do serviço STT.", example = "pt")
        String idioma,
        @Schema(description = "Probabilidade informada pelo STT; não é a precisão do texto.", example = "1.0")
        Double probabilidadeIdioma,
        @Schema(description = "Texto reconhecido em português.", example = "Preciso de ajuda com o acesso.")
        String transcricao
) {}
