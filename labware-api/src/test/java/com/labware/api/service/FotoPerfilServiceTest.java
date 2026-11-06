package com.labware.api.service;

import com.labware.api.dto.request.AtualizarPerfilRequest;
import com.labware.api.model.entity.*;
import com.labware.api.model.enums.PerfilUsuario;
import com.labware.api.repository.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.Optional;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FotoPerfilServiceTest {
    @TempDir Path fotos;
    UsuarioRepository usuarios;
    EmpresaRepository empresas;
    PerfilService service;
    Usuario usuario;

    @BeforeEach void preparar() {
        usuarios = mock(UsuarioRepository.class);
        empresas = mock(EmpresaRepository.class);
        service = new PerfilService(usuarios, mock(PasswordEncoder.class), empresas, fotos.toString());
        usuario = Usuario.builder().id(1L).nome("Cliente").email("cliente@teste.com")
                .perfil(PerfilUsuario.CLIENTE).build();
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario));
        when(usuarios.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test void rejeitaConteudoFalsoMesmoComMimeDeImagem() throws Exception {
        Path antiga = fotoAntiga();
        var erro = assertThrows(ResponseStatusException.class, () -> service.salvarFoto(1L,
                new MockMultipartFile("foto", "foto.png", "image/png", "nao e imagem".getBytes())));
        assertEquals(400, erro.getStatusCode().value());
        assertTrue(Files.exists(antiga));
    }

    @Test void falhaAoLerUploadPreservaFotoAnterior() throws Exception {
        Path antiga = fotoAntiga();
        var upload = mock(org.springframework.web.multipart.MultipartFile.class);
        when(upload.getInputStream()).thenThrow(new IOException("Falha de leitura"));
        assertThrows(ResponseStatusException.class, () -> service.salvarFoto(1L, upload));
        assertTrue(Files.exists(antiga));
        assertEquals("/api/usuarios/1/foto?v=123", usuario.getFotoPerfil());
    }

    @Test void falhaNoBancoPreservaFotoAnteriorELimpaNova() throws Exception {
        Path antiga = fotoAntiga();
        when(usuarios.saveAndFlush(any())).thenThrow(new IllegalStateException("Banco indisponivel"));
        assertThrows(IllegalStateException.class, () -> service.salvarFoto(1L, imagem()));
        assertTrue(Files.exists(antiga));
        try (var arquivos = Files.list(fotos)) { assertEquals(1, arquivos.count()); }
    }

    @Test void substituiFotoSomenteDepoisDoCommit() throws Exception {
        Path antiga = fotoAntiga();
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.salvarFoto(1L, imagem());
            assertTrue(Files.exists(antiga));
            var download = service.carregarFoto(1L);
            assertNotNull(ImageIO.read(download.recurso().getFile()));
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
            assertFalse(Files.exists(antiga));
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test void rollbackPreservaFotoAntigaERemoveNova() throws Exception {
        Path antiga = fotoAntiga();
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.salvarFoto(1L, imagem());
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            assertTrue(Files.exists(antiga));
            try (var arquivos = Files.list(fotos)) { assertEquals(1, arquivos.count()); }
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test void remocaoSoApagaArquivoAposCommit() throws Exception {
        Path antiga = fotoAntiga();
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertNull(service.removerFoto(1L).fotoPerfil());
            assertTrue(Files.exists(antiga));
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
            assertFalse(Files.exists(antiga));
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test void rollbackDaRemocaoPreservaArquivo() throws Exception {
        Path antiga = fotoAntiga();
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.removerFoto(1L);
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            assertTrue(Files.exists(antiga));
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test void falhaNoBancoDuranteRemocaoPreservaFoto() throws Exception {
        Path antiga = fotoAntiga();
        when(usuarios.saveAndFlush(any())).thenThrow(new IllegalStateException("Banco indisponivel"));
        assertThrows(IllegalStateException.class, () -> service.removerFoto(1L));
        assertTrue(Files.exists(antiga));
        assertEquals("/api/usuarios/1/foto?v=123", usuario.getFotoPerfil());
    }

    @Test void rejeitaBmpMesmoQuandoMimeDizPng() throws Exception {
        var out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "bmp", out);
        var upload = new MockMultipartFile("foto", "foto.png", "image/png", out.toByteArray());
        var erro = assertThrows(ResponseStatusException.class, () -> service.salvarFoto(1L, upload));
        assertEquals(400, erro.getStatusCode().value());
        verify(usuarios, never()).saveAndFlush(any());
    }

    private Path fotoAntiga() throws IOException {
        usuario.setFotoPerfil("/api/usuarios/1/foto?v=123");
        return Files.write(fotos.resolve("usuario-1.png"), new byte[]{1, 2});
    }

    private MockMultipartFile imagem() throws IOException {
        var out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", out);
        return new MockMultipartFile("foto", "foto.png", "image/png", out.toByteArray());
    }
}
