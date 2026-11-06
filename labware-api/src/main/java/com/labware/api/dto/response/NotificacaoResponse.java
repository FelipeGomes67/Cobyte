package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import com.labware.api.model.entity.Notificacao;
import java.time.LocalDateTime;
@Schema(description = "Alerta persistido pertencente ao usuário logado.")
public record NotificacaoResponse(
        @Schema(description = "Identificador do recurso.", example = "108")
        Long id,
        @Schema(description = "Identificador do usuário.", example = "1")
        Long usuarioId,
        @Schema(description = "Título do chamado.", example = "Falha no acesso ao sistema")
        String titulo,
        @Schema(description = "Mensagem.")
        String mensagem,
        @Schema(description = "Tipo do recurso ou da autenticação, conforme o contrato.")
        String tipo,
        @Schema(description = "Indica se a notificação foi lida.", example = "false")
        boolean lida,
        @Schema(description = "Identificador do chamado.", example = "108")
        Long chamadoId,
        @Schema(description = "Criado em.")
        LocalDateTime criadoEm
) {
    public static NotificacaoResponse from(Notificacao n) {
        return new NotificacaoResponse(n.getId(),n.getUsuario().getId(),n.getTitulo(),n.getMensagem(),n.getTipo(),
                n.isLida(),n.getChamado()!=null?n.getChamado().getId():null,n.getCriadoEm());
    }
}
