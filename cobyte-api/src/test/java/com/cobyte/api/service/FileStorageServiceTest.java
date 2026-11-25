package com.cobyte.api.service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class FileStorageServiceTest {
    @TempDir Path diretorio;

    @Test
    void rejeitaConteudoIncompativelMesmoComTipoDeclaradoPermitido() {
        var armazenamento = new FileStorageService(diretorio.toString(), 1024);
        var arquivo = new MockMultipartFile("arquivo", "evidencia.pdf", "application/pdf",
                "conteudo sem assinatura de PDF".getBytes(StandardCharsets.UTF_8));
        var erro = assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L, arquivo));
        assertEquals(415, erro.getStatusCode().value());
    }

    @Test
    void rejeitaArquivoAcimaDoLimite() {
        var armazenamento = new FileStorageService(diretorio.toString(), 8);
        var arquivo = new MockMultipartFile("arquivo", "evidencia.pdf", "application/pdf", new byte[9]);
        var erro = assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L, arquivo));
        assertEquals(413, erro.getStatusCode().value());
    }
}
