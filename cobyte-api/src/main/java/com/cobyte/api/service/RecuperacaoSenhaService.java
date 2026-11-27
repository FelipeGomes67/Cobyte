package com.cobyte.api.service;

import com.cobyte.api.model.entity.RecuperacaoSenha;
import com.cobyte.api.repository.RecuperacaoSenhaRepository;
import com.cobyte.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

@Service @RequiredArgsConstructor @Slf4j
public class RecuperacaoSenhaService {
    private final UsuarioRepository usuarios;
    private final RecuperacaoSenhaRepository recuperacoes;
    private final PasswordEncoder senhas;
    private final ApplicationEventPublisher eventos;
    @Value("${cobyte.jwt.secret}") private String segredo;
    private static final SecureRandom ALEATORIO = new SecureRandom();
    public record Solicitacao(String email) { }
    public record EmailRecuperacao(String destinatario, String codigo) { }

    // A consulta da conta ocorre fora da resposta HTTP, inclusive para e-mails inexistentes.
    @Async @EventListener @Transactional
    public void emitir(Solicitacao solicitacao) {
        String email = solicitacao.email().trim().toLowerCase(Locale.ROOT);
        var encontrado = usuarios.buscarIdPorEmail(email);
        if (encontrado.isEmpty()) return;
        var usuario = usuarios.buscarParaAprovacao(encontrado.get()).orElseThrow();
        if (!usuario.getEmail().equalsIgnoreCase(email)) return;
        String codigo = String.format(Locale.ROOT, "%06d", ALEATORIO.nextInt(1_000_000));
        recuperacoes.excluirPorUsuario(usuario.getId());
        var recuperacao = new RecuperacaoSenha();
        recuperacao.setHash(hash(usuario.getId(), codigo));
        recuperacao.setUsuario(usuario);
        recuperacao.setExpiraEm(Instant.now().plusSeconds(600));
        recuperacao.setVersaoSessao(usuario.versaoSessaoAtual());
        recuperacao.setEmail(usuario.getEmail());
        recuperacoes.saveAndFlush(recuperacao);
        eventos.publishEvent(new EmailRecuperacao(usuario.getEmail(), codigo));
    }

    @Transactional
    public boolean redefinir(String email, String codigo, String novaSenha) {
        if (novaSenha.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha deve ter no maximo 72 bytes UTF-8.");
        }
        var id = usuarios.buscarIdPorEmail(email.trim().toLowerCase(Locale.ROOT));
        if (id.isEmpty()) return false;
        // A emissao e o consumo bloqueiam primeiro o usuario, impedindo reutilizacao concorrente.
        var usuario = usuarios.buscarParaAprovacao(id.get()).orElseThrow();
        var registro = recuperacoes.findByUsuarioId(usuario.getId());
        if (registro.isEmpty()) return false;
        var recuperacao = registro.get();
        if (!recuperacao.getExpiraEm().isAfter(Instant.now())
                || !recuperacao.getVersaoSessao().equals(usuario.versaoSessaoAtual())
                || !recuperacao.getEmail().equalsIgnoreCase(usuario.getEmail())
                || recuperacao.getTentativas() >= 5) return false;
        if (!MessageDigest.isEqual(hash(usuario.getId(), codigo).getBytes(StandardCharsets.US_ASCII),
                recuperacao.getHash().getBytes(StandardCharsets.US_ASCII))) {
            recuperacao.setTentativas(recuperacao.getTentativas() + 1);
            recuperacoes.saveAndFlush(recuperacao);
            // Retorna normalmente para confirmar a contagem; o controller produz o erro depois do commit.
            return false;
        }
        usuario.setSenhaHash(senhas.encode(novaSenha));
        usuario.revogarSessoes();
        usuarios.saveAndFlush(usuario);
        recuperacoes.excluirPorUsuario(usuario.getId());
        return true;
    }

    private String hash(Long usuarioId, String codigo) {
        try {
            var mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(("recuperacao-senha:" + usuarioId + ":" + codigo).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException ex) { throw new IllegalStateException(ex); }
    }
}
