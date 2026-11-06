package com.labware.api.service;

import com.labware.api.dto.response.TranscricaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class TranscricaoChamadoService {
    private final PersistenciaTranscricaoService persistencia;
    private final TranscricaoService transcricao;

    public TranscricaoResponse transcrever(Long chamadoId, Long usuarioId, MultipartFile arquivo,
                                           boolean salvarAnexo, boolean salvarMensagem, boolean interna) {
        persistencia.verificar(chamadoId, usuarioId, salvarAnexo, salvarMensagem, interna);
        TranscricaoResponse dto = transcricao.transcreverAudio(arquivo);
        if (salvarAnexo || salvarMensagem) {
            persistencia.salvar(chamadoId, usuarioId, arquivo, dto, salvarAnexo, salvarMensagem, interna);
        }
        return dto;
    }
}
