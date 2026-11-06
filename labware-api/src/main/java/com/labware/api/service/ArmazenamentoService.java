package com.labware.api.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface ArmazenamentoService {
    record Arquivo(String nomeArquivo, String tipoConteudo, String caminhoArquivo, long tamanhoBytes) {}
    Arquivo salvar(Long chamadoId, MultipartFile arquivo);
    Resource carregar(Long chamadoId, String caminhoArquivo);
    void excluir(Long chamadoId, String caminhoArquivo);
}
