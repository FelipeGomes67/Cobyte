package com.labware.api.service;

import com.labware.api.dto.request.*;
import com.labware.api.dto.response.PerfilResponse;
import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.PerfilUsuario;
import com.labware.api.repository.UsuarioRepository;
import com.labware.api.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Locale;

@Service
@Transactional
public class PerfilService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final com.labware.api.repository.EmpresaRepository empresas;
    private final Path diretorioFotos;

    public record FotoPerfilDownload(Resource recurso, MediaType mediaType) {}

    @Autowired
    public PerfilService(UsuarioRepository usuarios,
                         PasswordEncoder encoder,
                         com.labware.api.repository.EmpresaRepository empresas,
                         @Value("${labware.uploads.diretorio-fotos:./uploads/fotos}") String diretorioFotos) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.empresas = empresas;
        this.diretorioFotos = Path.of(diretorioFotos).toAbsolutePath().normalize();
    }

    // Construtor para compatibilidade com testes unitários
    public PerfilService(UsuarioRepository usuarios,
                         PasswordEncoder encoder,
                         com.labware.api.repository.EmpresaRepository empresas) {
        this(usuarios, encoder, empresas, "./uploads/fotos");
    }

    @Transactional(readOnly = true)
    public com.labware.api.dto.response.PaginaResponse<PerfilResponse> listarClientes(String busca, int page, int size) {
        return com.labware.api.dto.response.PaginaResponse.from(usuarios.listarClientes(busca == null ? "" : busca.trim(),
                        org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("nome", "id")))
                .map(PerfilResponse::from));
    }

    public com.labware.api.dto.response.EmpresaResumoResponse cadastrarEmpresa(CadastrarEmpresaRequest r) {
        String documento = r.cnpj().trim().replaceAll("[./\\-]", "").toUpperCase(Locale.ROOT);
        if (!documento.matches("[A-Z0-9]{12}[0-9]{2}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um CNPJ com 14 caracteres, com ou sem pontuação");
        String cnpj = documento.substring(0, 2) + "." + documento.substring(2, 5) + "." + documento.substring(5, 8) + "/" + documento.substring(8, 12) + "-" + documento.substring(12);
        if (empresas.findByCnpj(cnpj).isPresent() || empresas.findByCnpj(documento).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma empresa com este CNPJ");
        var empresa = empresas.saveAndFlush(com.labware.api.model.entity.Empresa.builder()
                .nome(r.nome().trim()).cnpj(cnpj).ativa(true).build());
        return new com.labware.api.dto.response.EmpresaResumoResponse(empresa.getId(), empresa.getNome(), empresa.getCnpj());
    }

    @Transactional(readOnly = true)
    public java.util.List<com.labware.api.dto.response.EmpresaResumoResponse> listarEmpresas() {
        return empresas.findByAtivaTrueOrderByNomeAsc().stream()
                .map(e -> new com.labware.api.dto.response.EmpresaResumoResponse(e.getId(), e.getNome(), e.getCnpj())).toList();
    }

    public PerfilResponse cadastrar(CadastroRequest r) {
        String email = normalizar(r.email());
        verificarEmail(email, null);
        validarSenha(r.senha());
        return PerfilResponse.from(usuarios.saveAndFlush(Usuario.builder().nome(r.nome().trim())
                .email(email).senhaHash(encoder.encode(r.senha())).perfil(PerfilUsuario.CLIENTE).empresa(null).empresaInformada(r.empresaInformada().trim()).build()));
    }

    @Transactional(readOnly = true)
    public PerfilResponse buscar(Long id) {
        return PerfilResponse.from(usuario(id));
    }

    public PerfilResponse atualizar(Long id, AtualizarPerfilRequest r) {
        if (r.fotoPerfil() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use os endpoints de upload ou remoção para alterar a foto");
        }
        var u = usuario(id);
        String email = normalizar(r.email());
        verificarEmail(email, id);
        if (r.empresaId() != null || r.empresa() != null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente o suporte pode vincular sua empresa");
        }
        u.setNome(r.nome().trim());
        u.setEmail(email);
        u.setCargo(r.cargo() != null ? r.cargo().trim() : null);
        u.setTelefone(r.telefone() != null ? r.telefone().trim() : null);

        return PerfilResponse.from(usuarios.saveAndFlush(u));
    }

    public void senha(Long id, AlterarSenhaRequest r) {
        var u = usuario(id);
        if (!encoder.matches(r.senhaAtual(), u.getSenhaHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual incorreta");
        validarSenha(r.novaSenha());
        u.setSenhaHash(encoder.encode(r.novaSenha()));
    }

    public PerfilResponse salvarFoto(Long id, MultipartFile arquivo) {
        var u = usuario(id);
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo de foto ausente ou vazio");
        }

        if (arquivo.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "A foto de perfil deve ter no máximo 10 MB");
        }

        // Decode the content instead of trusting the MIME type supplied by the client.
        Path novaFoto = null;
        String fotoAnterior = u.getFotoPerfil();
        try {
            byte[] dados;
            try (InputStream in = arquivo.getInputStream()) {
                dados = in.readNBytes(10 * 1024 * 1024 + 1);
            }
            if (dados.length > 10 * 1024 * 1024) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Foto excede 10 MB");
            }
            java.awt.image.BufferedImage imagem;
            try (var entrada = javax.imageio.ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(dados))) {
                var leitores = javax.imageio.ImageIO.getImageReaders(entrada);
                if (!leitores.hasNext()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Imagem invalida. Use JPEG, PNG ou GIF");
                }
                var leitor = leitores.next();
                try {
                    if (!java.util.Set.of("jpeg", "png", "gif").contains(leitor.getFormatName().toLowerCase(Locale.ROOT))) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use JPEG, PNG ou GIF");
                    }
                    leitor.setInput(entrada);
                    if ((long) leitor.getWidth(0) * leitor.getHeight(0) > 20_000_000) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Imagem excede 20 megapixels");
                    }
                    imagem = leitor.read(0);
                } finally {
                    leitor.dispose();
                }
            }
            Files.createDirectories(diretorioFotos);
            String versao = java.util.UUID.randomUUID().toString();
            novaFoto = diretorioFotos.resolve("usuario-" + id + "." + versao + ".png");
            if (!javax.imageio.ImageIO.write(imagem, "png", novaFoto.toFile())) {
                throw new IOException("Nao foi possivel codificar a imagem");
            }
            u.setFotoPerfil("/api/usuarios/" + id + "/foto?v=" + versao);
            var resposta = PerfilResponse.from(usuarios.saveAndFlush(u));
            Path gravada = novaFoto;
            if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                        new org.springframework.transaction.support.TransactionSynchronization() {
                            @Override
                            public void afterCompletion(int status) {
                                if (status != STATUS_COMMITTED) apagarFoto(gravada);
                                else apagarFotoAnterior(id, fotoAnterior);
                            }
                        });
            } else {
                apagarFotoAnterior(id, fotoAnterior);
            }
            return resposta;
        } catch (javax.imageio.IIOException ex) {
            apagarFoto(novaFoto);
            u.setFotoPerfil(fotoAnterior);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conteudo de imagem invalido", ex);
        } catch (IOException ex) {
            apagarFoto(novaFoto);
            u.setFotoPerfil(fotoAnterior);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao gravar foto de perfil", ex);
        } catch (RuntimeException ex) {
            apagarFoto(novaFoto);
            u.setFotoPerfil(fotoAnterior);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public FotoPerfilDownload carregarFoto(Long id) {
        var u = usuario(id);
        try {
            Path foto = localizarFoto(id, u.getFotoPerfil());
            String nome = foto.getFileName().toString().toLowerCase(Locale.ROOT);
            MediaType tipo = nome.endsWith(".png") ? MediaType.IMAGE_PNG
                    : nome.endsWith(".gif") ? MediaType.IMAGE_GIF
                    : nome.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                    : MediaType.IMAGE_JPEG;
            return new FotoPerfilDownload(new FileSystemResource(foto), tipo);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao carregar foto de perfil", ex);
        }
    }

    private Path localizarFoto(Long id, String url) throws IOException {
        if (url == null || !Files.isDirectory(diretorioFotos)) {
            throw new ResourceNotFoundException("Foto de perfil nao encontrada");
        }
        String versao = url.contains("?v=") ? url.substring(url.indexOf("?v=") + 3) : "";
        // Legacy uploads used a timestamp in the URL and a fixed filename.
        boolean versionada = versao.matches("[a-f0-9-]{36}");
        String prefixo = "usuario-" + id + "." + (versionada ? versao + "." : "");
        try (var arquivos = Files.list(diretorioFotos)) {
            return arquivos.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().startsWith(prefixo))
                    .filter(p -> versionada || p.getFileName().toString().matches("usuario-" + id + "[.](jpg|jpeg|png|gif|webp)"))
                    .findFirst().orElseThrow(() -> new ResourceNotFoundException("Foto de perfil nao encontrada"));
        }
    }

    private void apagarFotoAnterior(Long id, String url) {
        if (url == null) return;
        try {
            apagarFoto(localizarFoto(id, url));
        } catch (IOException | ResourceNotFoundException ex) {
            // The new photo is already persisted; a missing old file does not invalidate it.
        }
    }

    private void apagarFoto(Path foto) {
        if (foto == null) return;
        try {
            Files.deleteIfExists(foto);
        } catch (IOException ex) {
            org.slf4j.LoggerFactory.getLogger(PerfilService.class).warn("Falha ao remover foto {}", foto, ex);
        }
    }

    public PerfilResponse removerFoto(Long id) {
        var u = usuario(id);
        String fotoAnterior = u.getFotoPerfil();
        u.setFotoPerfil(null);
        try {
            var resposta = PerfilResponse.from(usuarios.saveAndFlush(u));
            if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override
                        public void afterCompletion(int status) {
                            if (status == STATUS_COMMITTED) apagarFotoAnterior(id, fotoAnterior);
                        }
                    });
            } else {
                apagarFotoAnterior(id, fotoAnterior);
            }
            return resposta;
        } catch (RuntimeException ex) {
            u.setFotoPerfil(fotoAnterior);
            throw ex;
        }
    }

    private void verificarEmail(String email, Long id) {
        usuarios.findByEmailIgnoreCase(email).filter(u -> !u.getId().equals(id)).ifPresent(u -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        });
    }

    private void validarSenha(String senha) {
        if (senha.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha deve ter até 72 bytes UTF-8");
    }

    private String normalizar(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private Usuario usuario(Long id) {
        return usuarios.findById(id).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }
}
