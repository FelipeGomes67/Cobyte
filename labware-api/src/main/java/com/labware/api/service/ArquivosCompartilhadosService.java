package com.labware.api.service;

import com.labware.api.model.entity.ArquivoCompartilhado;
import com.labware.api.repository.ArquivoCompartilhadoRepository;
import com.labware.api.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.Locale;

@Service
public class ArquivosCompartilhadosService {
    private final ArquivoCompartilhadoRepository arquivos;
    private final boolean habilitado;
    public ArquivosCompartilhadosService(ArquivoCompartilhadoRepository arquivos,
            @Value("${labware.uploads.armazenamento:banco}") String modo) {
        this.arquivos = arquivos;
        String valor = modo.toLowerCase(Locale.ROOT);
        if (!valor.equals("banco") && !valor.equals("local"))
            throw new IllegalArgumentException("Armazenamento deve ser banco ou local");
        this.habilitado = valor.equals("banco");
    }
    public boolean habilitado() { return habilitado; }
    @Transactional
    public void salvar(String chave, byte[] dados) {
        var arquivo = new ArquivoCompartilhado();
        arquivo.setChave(chave);
        arquivo.setConteudo(dados);
        arquivos.save(arquivo);
    }
    @Transactional(readOnly = true)
    public boolean existe(String chave) { return arquivos.existsById(chave); }
    @Transactional(readOnly = true)
    public Resource carregar(String chave) {
        byte[] dados = arquivos.findById(chave)
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo compartilhado não encontrado")).getConteudo();
        return new ByteArrayResource(dados);
    }
    // Usado pela limpeza posterior ao commit; não depende da transação já encerrada.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void excluir(String chave) { arquivos.deleteById(chave); }
}
