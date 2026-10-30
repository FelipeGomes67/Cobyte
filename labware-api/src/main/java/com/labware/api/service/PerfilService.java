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
import java.io.OutputStream;
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
                .map(u -> new PerfilResponse(u.getId(), u.getNome(), u.getEmail(), u.getCargo(),
                        u.getEmpresa() == null ? null : u.getEmpresa().getNome(),
                        u.getEmpresa() == null ? null : u.getEmpresa().getId(), u.getPerfil())));
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
                .email(email).senhaHash(encoder.encode(r.senha())).perfil(PerfilUsuario.CLIENTE).build()));
    }

    @Transactional(readOnly = true)
    public PerfilResponse buscar(Long id) {
        return PerfilResponse.from(usuario(id));
    }

    public PerfilResponse atualizar(Long id, AtualizarPerfilRequest r) {
        var u = usuario(id);
        String email = normalizar(r.email());
        verificarEmail(email, id);
        var empresaSelecionada = u.getEmpresa();
        if (r.empresaId() != null) {
            if (u.getPerfil() != PerfilUsuario.CLIENTE) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente CLIENTE pode escolher a própria empresa");
            }
            empresaSelecionada = empresas.findById(r.empresaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
            if (!empresaSelecionada.isAtiva()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa inativa");
            }
        }
        u.setEmpresa(empresaSelecionada);
        u.setNome(r.nome().trim());
        u.setEmail(email);
        u.setCargo(r.cargo() != null ? r.cargo().trim() : null);
        u.setTelefone(r.telefone() != null ? r.telefone().trim() : null);

        // Atualização condicional por perfil
        if (u.getPerfil() == PerfilUsuario.CLIENTE) {
            if (r.fotoPerfil() != null) {
                u.setFotoPerfil(r.fotoPerfil().trim());
            }
        }

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

        String contentType = arquivo.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas arquivos de imagem (JPEG, PNG, WEBP, etc.) são permitidos");
        }

        String extensao = extrairExtensao(arquivo.getOriginalFilename(), contentType);

        try {
            Files.createDirectories(diretorioFotos);
            limparFotosAntigas(id);

            String nomeDestino = "usuario-" + id + extensao;
            Path destino = diretorioFotos.resolve(nomeDestino).normalize();
            if (!destino.getParent().equals(diretorioFotos)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de arquivo inválido");
            }

            try (InputStream in = arquivo.getInputStream();
                 OutputStream out = Files.newOutputStream(destino, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
                in.transferTo(out);
            }

            String urlFoto = "/api/usuarios/" + id + "/foto?v=" + System.currentTimeMillis();
            u.setFotoPerfil(urlFoto);
            return PerfilResponse.from(usuarios.saveAndFlush(u));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao gravar foto de perfil", ex);
        }
    }

    @Transactional(readOnly = true)
    public FotoPerfilDownload carregarFoto(Long id) {
        try {
            if (!Files.exists(diretorioFotos)) {
                throw new ResourceNotFoundException("Foto de perfil não encontrada");
            }

            try (var stream = Files.list(diretorioFotos)) {
                Path arquivoEncontrado = stream
                        .filter(p -> p.getFileName().toString().startsWith("usuario-" + id + "."))
                        .findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("Foto de perfil não encontrada"));

                String nome = arquivoEncontrado.getFileName().toString().toLowerCase(Locale.ROOT);
                MediaType mediaType = MediaType.IMAGE_JPEG;
                if (nome.endsWith(".png")) {
                    mediaType = MediaType.IMAGE_PNG;
                } else if (nome.endsWith(".webp")) {
                    mediaType = MediaType.parseMediaType("image/webp");
                } else if (nome.endsWith(".gif")) {
                    mediaType = MediaType.IMAGE_GIF;
                }

                return new FotoPerfilDownload(new FileSystemResource(arquivoEncontrado), mediaType);
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao carregar foto de perfil", ex);
        }
    }

    public PerfilResponse removerFoto(Long id) {
        var u = usuario(id);
        limparFotosAntigas(id);
        u.setFotoPerfil(null);
        return PerfilResponse.from(usuarios.saveAndFlush(u));
    }

    private void limparFotosAntigas(Long id) {
        if (!Files.exists(diretorioFotos)) return;
        try (var stream = Files.list(diretorioFotos)) {
            stream.filter(p -> p.getFileName().toString().startsWith("usuario-" + id + "."))
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                    });
        } catch (IOException ignored) {}
    }

    private String extrairExtensao(String nomeArquivo, String contentType) {
        if (contentType != null) {
            if (contentType.equalsIgnoreCase("image/png")) return ".png";
            if (contentType.equalsIgnoreCase("image/webp")) return ".webp";
            if (contentType.equalsIgnoreCase("image/gif")) return ".gif";
            if (contentType.equalsIgnoreCase("image/jpeg") || contentType.equalsIgnoreCase("image/jpg")) return ".jpg";
        }
        if (nomeArquivo != null && nomeArquivo.contains(".")) {
            String ext = nomeArquivo.substring(nomeArquivo.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (ext.matches("\\.(jpg|jpeg|png|webp|gif)")) {
                return ext.equals(".jpeg") ? ".jpg" : ext;
            }
        }
        return ".jpg";
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
