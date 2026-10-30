package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

@Schema(description = "Mensagem com anexo opcional. Aceita o legado visivelAoCliente com semântica inversa; indicadores conflitantes são rejeitados.")
public record CriarMensagemRequest(
        @Schema(description = "Conteúdo textual da mensagem.", example = "Segue a informação solicitada.")
        @NotBlank String conteudo,
        @Schema(description = "true para nota interna; somente SUPORTE/ADMIN podem enviá-la. Padrão false.", example = "false")
        boolean visivelApenasSuporte,
        @Schema(description = "Anexo opcional pertencente ao mesmo chamado.", example = "10")
        @Positive Long anexoId
) {
    public CriarMensagemRequest(String conteudo, boolean visivelApenasSuporte) {
        this(conteudo, visivelApenasSuporte, null);
    }
    // Aceita o contrato antigo invertendo a semantica, evitando publicar uma nota interna legada.
    @JsonCreator
    public static CriarMensagemRequest criar(@JsonProperty("conteudo") String conteudo,
                                             @JsonProperty("visivelApenasSuporte") Boolean apenasSuporte,
                                             @JsonProperty("visivelAoCliente") Boolean aoCliente,
                                             @JsonProperty("anexoId") Long anexoId) {
        if (apenasSuporte != null && aoCliente != null && apenasSuporte.equals(aoCliente)) {
            throw new IllegalArgumentException("Indicadores de visibilidade conflitantes");
        }
        return new CriarMensagemRequest(conteudo, apenasSuporte != null ? apenasSuporte : Boolean.FALSE.equals(aoCliente), anexoId);
    }
}
