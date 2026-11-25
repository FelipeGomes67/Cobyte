package com.cobyte.api.service;

import com.cobyte.api.exception.ResourceNotFoundException;
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
    private final ArquivosCompartilhadosService compartilhados;

    @org.springframework.beans.factory.annotation.Autowired
    public FileStorageService(@Value("${cobyte.uploads.diretorio:./uploads/chamados}") String diretorio,
                              @Value("${cobyte.uploads.tamanho-maximo-bytes:10485760}") long tamanhoMaximo,
                              ArquivosCompartilhadosService compartilhados) {
        this.raiz = Path.of(diretorio).toAbsolutePath().normalize();
        if (tamanhoMaximo <= 0 || tamanhoMaximo > Integer.MAX_VALUE - 1) throw new IllegalArgumentException("Limite de upload inválido");
        this.tamanhoMaximo = tamanhoMaximo;
        this.compartilhados = compartilhados;
    }

    public FileStorageService(String diretorio, long tamanhoMaximo) {
        this(diretorio, tamanhoMaximo, null);
    }

    @Override
    public Arquivo salvar(Long chamadoId, MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio ou ausente");
        }
        validarTamanho(arquivo.getSize());
        String nome = sanitizarNome(arquivo.getOriginalFilename());
        diretorio(chamadoId); // valida o escopo antes de gravar.
        if (compartilhados != null && compartilhados.habilitado()) {
            try (var entrada = arquivo.getInputStream()) {
                byte[] dados = entrada.readNBytes((int) tamanhoMaximo + 1);
                validarTamanho(dados.length);
                if (dados.length == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio");
                String tipo = TipoArquivoPermitido.identificar(nome, dados, false);
                String chave = "anexos/" + chamadoId + "/" + UUID.randomUUID();
                compartilhados.salvar(chave, dados);
                return new Arquivo(nome, tipo, "db:" + chave, dados.length);
            } catch (IOException ex) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao armazenar arquivo", ex);
            }
        }
        Path destino = diretorio(chamadoId).resolve(UUID.randomUUID().toString());
        try {
            String tipo;
            Files.createDirectories(raiz);
            if (Files.isSymbolicLink(raiz)) throw new AccessDeniedException("Diretório de upload inválido");
            Files.createDirectories(destino.getParent());
            verificarDiretorio(destino.getParent());
            // CREATE_NEW impede sobrescrita. O nome recebido nunca compoe o caminho fisico.
            try (var entrada = arquivo.getInputStream();
                 var saida = Files.newOutputStream(destino, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                byte[] cabecalho = entrada.readNBytes(16);
                validarTamanho(cabecalho.length);
                if (cabecalho.length == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio");
                tipo = TipoArquivoPermitido.identificar(nome, cabecalho, false);
                saida.write(cabecalho);
                long total = cabecalho.length;
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
            return new Arquivo(nome, tipo, destino.toString(), tamanho);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao armazenar arquivo", ex);
        }
    }

    @Override
    public Resource carregar(Long chamadoId, String caminhoArquivo) {
        if (caminhoArquivo != null && caminhoArquivo.startsWith("db:")) {
            return compartilhados.carregar(chaveBanco(chamadoId, caminhoArquivo));
        }
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
        if (caminhoArquivo != null && caminhoArquivo.startsWith("db:")) {
            // Uma gravação compartilhada participa da transação do anexo e é revertida com ela.
            return;
        }
        Path arquivo = validarCaminho(chamadoId, caminhoArquivo);
        try {
            verificarDiretorio(arquivo.getParent());
            Files.deleteIfExists(arquivo);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao remover arquivo", ex);
        }
    }

    public void excluirDiretorioChamado(Long chamadoId) {
        Path pasta = diretorio(chamadoId);
        if (!Files.exists(pasta, LinkOption.NOFOLLOW_LINKS)) return;
        try {
            verificarDiretorio(pasta);
            // Uploads são arquivos diretos. Não seguir links nem apagar diretórios arbitrários.
            try (var itens = Files.list(pasta)) {
                for (Path arquivo : itens.toList()) {
                    if (Files.isDirectory(arquivo, LinkOption.NOFOLLOW_LINKS))
                        throw new IOException("Subdiretório inesperado no armazenamento do chamado");
                    Files.deleteIfExists(arquivo);
                }
            }
            Files.deleteIfExists(pasta);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao limpar arquivos do chamado", ex);
        }
    }

    private String chaveBanco(Long chamadoId, String caminho) {
        diretorio(chamadoId);
        String chave = caminho.substring(3);
        if (!chave.matches("anexos/" + chamadoId + "/[a-f0-9-]{36}"))
            throw new AccessDeniedException("Arquivo fora do escopo do chamado");
        return chave;
    }

    public Arquivo migrarLocal(Long chamadoId, String caminho, String nome, String tipo) {
        if (compartilhados == null || !compartilhados.habilitado())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ative o armazenamento compartilhado");
        String nomeFisico = caminho.replace('\\', '/');
        nomeFisico = nomeFisico.substring(nomeFisico.lastIndexOf('/') + 1);
        if (!nomeFisico.matches("[a-fA-F0-9-]{36}")) throw new AccessDeniedException("Nome físico legado inválido");
        Path local = diretorio(chamadoId).resolve(nomeFisico);
        Resource recurso = carregar(chamadoId, local.toString());
        try (var entrada = recurso.getInputStream()) {
            byte[] dados = entrada.readNBytes((int) tamanhoMaximo + 1);
            validarTamanho(dados.length);
            if (dados.length == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo legado vazio");
            String chave = "anexos/" + chamadoId + "/" + UUID.randomUUID();
            compartilhados.salvar(chave, dados);
            return new Arquivo(nome, tipo, "db:" + chave, dados.length);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao importar arquivo local", ex);
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
