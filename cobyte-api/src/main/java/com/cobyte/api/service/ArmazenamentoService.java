package com.cobyte.api.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface ArmazenamentoService {
    record Arquivo(String nomeArquivo, String tipoConteudo, String caminhoArquivo, long tamanhoBytes) {}
    Arquivo salvar(Long chamadoId, MultipartFile arquivo);
    default Arquivo salvarAudio(Long chamadoId, MultipartFile arquivo) {
        throw new UnsupportedOperationException("Armazenamento de áudio não implementado");
    }
    Resource carregar(Long chamadoId, String caminhoArquivo);
    void excluir(Long chamadoId, String caminhoArquivo);
}
