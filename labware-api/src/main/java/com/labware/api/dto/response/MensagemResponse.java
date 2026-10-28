package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import com.labware.api.model.entity.Mensagem;
import com.labware.api.model.enums.TipoMensagem;
import java.time.LocalDateTime;

@Schema(description = "Mensagem pública ou interna com autor identificado pelo usuário do JWT.")
public record MensagemResponse(
        @Schema(description = "Identificador do recurso.", example = "108")
        Long id,
        @Schema(description = "Identificador do chamado.", example = "108")
        Long chamadoId,
        @Schema(description = "Identificador do usuário.", example = "1")
        Long usuarioId,
        @Schema(description = "Usuário autenticado ou nome do autor, conforme o contrato.")
        String usuario,
        @Schema(description = "Perfil do autor da mensagem.", example = "SUPORTE")
        String perfilUsuario,
        @Schema(description = "Conteúdo textual da mensagem.", example = "Segue a informação solicitada.")
        String conteudo,
        @Schema(description = "true para nota interna; somente SUPORTE/ADMIN podem enviá-la. Padrão false.", example = "false")
        boolean visivelApenasSuporte,
        @Schema(description = "Criado em.")
        LocalDateTime criadoEm,
        @Schema(description = "Anexo opcional pertencente ao mesmo chamado.", example = "10")
        Long anexoId,
        @Schema(description = "Tipo do recurso ou da autenticação, conforme o contrato.")
        TipoMensagem tipo,
        @Schema(description = "URL relativa para download autenticado.", example = "/api/chamados/anexos/10/download")
        String downloadUrl
) {
    public static MensagemResponse from(Mensagem m) {
        Long anexoId = m.getAnexo() != null ? m.getAnexo().getId() : null;
        return new MensagemResponse(m.getId(), m.getChamado().getId(), m.getUsuario().getId(),
                m.getUsuario().getNome(), m.getUsuario().getPerfil().name(), m.getConteudo(),
                m.isVisivelApenasSuporte(), m.getCriadoEm(), anexoId, m.getTipo(),
                anexoId != null ? "/api/chamados/anexos/" + anexoId + "/download" : null);
    }
}
