package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import com.labware.api.model.entity.Anexo;
import java.time.LocalDateTime;

@Schema(description = "Metadados de anexo; caminho físico não é exposto e download exige autenticação.")
public record AnexoResponse(
        @Schema(description = "Identificador do recurso.", example = "108")
        Long id,
        @Schema(description = "Identificador do chamado.", example = "108")
        Long chamadoId,
        @Schema(description = "Identificador do usuário.", example = "1")
        Long usuarioId,
        @Schema(description = "Nome sanitizado do arquivo.", example = "relato.wav")
        String nomeArquivo,
        @Schema(description = "MIME type do arquivo.", example = "audio/wav")
        String tipoConteudo,
        @Schema(description = "Tamanho do arquivo armazenado em bytes.", example = "102400")
        long tamanhoBytes,
        @Schema(description = "Enviado em.")
        LocalDateTime enviadoEm,
        @Schema(description = "URL relativa para download autenticado.", example = "/api/chamados/anexos/10/download")
        String downloadUrl,
        @Schema(description = "Duração do áudio em segundos; null quando não disponível.", example = "12.5")
        Double duracaoAudioSegundos
) {
    public static AnexoResponse from(Anexo a) {
        return new AnexoResponse(a.getId(), a.getChamado().getId(), a.getUsuario().getId(),
                a.getNomeArquivo(), a.getTipoConteudo(), a.getTamanhoBytes(), a.getEnviadoEm(),
                "/api/chamados/anexos/" + a.getId() + "/download", a.getDuracaoAudioSegundos());
    }
}
