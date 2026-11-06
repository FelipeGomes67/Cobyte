package com.labware.api.service;

import com.labware.api.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService implements ArmazenamentoService {
    private final Path raiz;
    private final long tamanhoMaximo;

    public FileStorageService(@Value("${labware.uploads.diretorio:./uploads/chamados}") String diretorio,
                              @Value("${labware.uploads.tamanho-maximo-bytes:10485760}") long tamanhoMaximo) {
        this.raiz = Path.of(diretorio).toAbsolutePath().normalize();
        if (tamanhoMaximo <= 0) throw new IllegalArgumentException("Limite de upload deve ser positivo");
        this.tamanhoMaximo = tamanhoMaximo;
    }

    @Override
    public Arquivo salvar(Long chamadoId, MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio ou ausente");
        }
        validarTamanho(arquivo.getSize());
        String nome = sanitizarNome(arquivo.getOriginalFilename());
        Path destino = diretorio(chamadoId).resolve(UUID.randomUUID().toString());
        try {
            Files.createDirectories(raiz);
            if (Files.isSymbolicLink(raiz)) throw new AccessDeniedException("Diretório de upload inválido");
            Files.createDirectories(destino.getParent());
            verificarDiretorio(destino.getParent());
            // CREATE_NEW impede sobrescrita. O nome recebido nunca compoe o caminho fisico.
            try (var entrada = arquivo.getInputStream();
                 var saida = Files.newOutputStream(destino, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                long total = 0;
                byte[] buffer = new byte[8192];
                int lidos;
                while ((lidos = entrada.read(buffer)) != -1) {
                    total += lidos;
                    validarTamanho(total);
                    saida.write(buffer, 0, lidos);
                }
            } catch (IOException | RuntimeException ex) {
                try { Files.deleteIfExists(destino); } catch (IOException limpeza) { ex.addSuppressed(limpeza); }
                throw ex;
            }
            long tamanho = Files.size(destino);
            if (tamanho == 0) {
                Files.deleteIfExists(destino);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio");
            }
            String tipo = arquivo.getContentType();
            if (tipo != null && (tipo.length() > 255 || tipo.chars().anyMatch(Character::isISOControl))) {
                tipo = "application/octet-stream";
            }
            return new Arquivo(nome, tipo, destino.toString(), tamanho);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao armazenar arquivo", ex);
        }
    }

    @Override
    public Resource carregar(Long chamadoId, String caminhoArquivo) {
        Path arquivo = validarCaminho(chamadoId, caminhoArquivo);
        try {
            if (!Files.exists(arquivo, LinkOption.NOFOLLOW_LINKS)) throw new ResourceNotFoundException("Arquivo não encontrado");
            verificarDiretorio(arquivo.getParent());
            if (Files.isSymbolicLink(arquivo) || !Files.isRegularFile(arquivo, LinkOption.NOFOLLOW_LINKS)) {
                throw new AccessDeniedException("Caminho de arquivo inválido");
            }
            return new FileSystemResource(arquivo);
        } catch (NoSuchFileException ex) {
            throw new ResourceNotFoundException("Arquivo não encontrado");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao ler arquivo", ex);
        }
    }

    @Override
    public void excluir(Long chamadoId, String caminhoArquivo) {
        Path arquivo = validarCaminho(chamadoId, caminhoArquivo);
        try {
            verificarDiretorio(arquivo.getParent());
            Files.deleteIfExists(arquivo);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao remover arquivo", ex);
        }
    }

    private Path diretorio(Long chamadoId) {
        if (chamadoId == null || chamadoId <= 0) throw new AccessDeniedException("Chamado inválido");
        return raiz.resolve(chamadoId.toString());
    }

    private Path validarCaminho(Long chamadoId, String caminhoArquivo) {
        Path arquivo;
        try { arquivo = Path.of(caminhoArquivo).toAbsolutePath().normalize(); }
        catch (InvalidPathException | NullPointerException ex) { throw new AccessDeniedException("Caminho inválido"); }
        if (!diretorio(chamadoId).equals(arquivo.getParent())) {
            throw new AccessDeniedException("Arquivo fora do diretório do chamado");
        }
        return arquivo;
    }

    private void verificarDiretorio(Path diretorio) throws IOException {
        if (Files.isSymbolicLink(raiz) || Files.isSymbolicLink(diretorio)
                || !diretorio.toRealPath().startsWith(raiz.toRealPath())) {
            throw new AccessDeniedException("Diretório de arquivo inválido");
        }
    }

    private void validarTamanho(long tamanho) {
        if (tamanho > tamanhoMaximo) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Arquivo excede o tamanho permitido");
        }
    }

    private String sanitizarNome(String original) {
        if (original == null || original.isBlank()) return "arquivo";
        String nome = original.replace('\\', '/');
        nome = nome.substring(nome.lastIndexOf('/') + 1)
                .replaceAll("[\\p{Cntrl}<>:\"/\\\\|?*]", "_").strip();
        if (nome.isBlank() || nome.equals(".") || nome.equals("..")) nome = "arquivo";
        return nome.substring(0, Math.min(nome.length(), 255));
    }
}
