package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
@Schema(description = "Preferências de alertas persistidas no usuário. Todas as opções são obrigatórias no PUT.")
public record ConfiguracaoNotificacaoRequest(
        @Schema(description = "Receber alertas de novas mensagens; padrão true quando não configurado.", example = "true")
        @NotNull Boolean novasMensagens,
        @Schema(description = "Receber alertas de mudança de status.", example = "true")
        @NotNull Boolean alteracoesStatus,
        @Schema(description = "Receber alertas de atribuição de chamados.", example = "true")
        @NotNull Boolean atribuicoes,
        @Schema(description = "Enviar também por e-mail; habilitado somente quando true.")
        Boolean notificarEmail
) {
    public ConfiguracaoNotificacaoRequest(Boolean novasMensagens, Boolean alteracoesStatus, Boolean atribuicoes) {
        this(novasMensagens, alteracoesStatus, atribuicoes, null);
    }
}
