package com.cobyte.api;

import com.cobyte.api.model.entity.RecuperacaoSenha;
import com.cobyte.api.model.entity.Usuario;
import com.cobyte.api.model.enums.PerfilUsuario;
import com.cobyte.api.repository.RecuperacaoSenhaRepository;
import com.cobyte.api.repository.UsuarioRepository;
import com.cobyte.api.service.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.mockito.ArgumentCaptor;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "cobyte.jwt.secret=segredo-sintetico-exclusivo-teste-recuperacao",
    "spring.datasource.url=jdbc:h2:mem:recuperacao-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "cobyte.limites.cadastro-ip=100"
})
@AutoConfigureMockMvc
class RecuperacaoSenhaFluxoTest {
    @Autowired MockMvc http;
    @Autowired UsuarioRepository usuarios;
    @Autowired RecuperacaoSenhaRepository recuperacoes;
    @Autowired PasswordEncoder senhas;
    @Autowired TokenService tokens;
    @MockitoBean JavaMailSender correio;
    @MockitoBean com.cobyte.api.service.ClassificadorIaService classificador;
    @MockitoBean com.cobyte.api.service.TranscricaoService transcritor;

    @Test
    void enviaCodigoTemporarioGravaSomenteHmacTrocaSenhaERevogaTokenAnterior() throws Exception {
        var usuario = conta("fluxo-completo");
        String jwt = "Bearer " + tokens.gerar(usuario).valor();
        http.perform(get("/api/usuarios/me").header("Authorization", jwt)).andExpect(status().isOk());
        http.perform(post("/api/auth/esqueci-senha").contentType("application/json")
                .content("{\"email\":\"" + usuario.getEmail() + "\"}"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("token").doesNotExist());
        var email = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(correio, timeout(5000)).send(email.capture());
        assertEquals(usuario.getEmail(), email.getValue().getTo()[0]);
        String texto = email.getValue().getText();
        var padrao = java.util.regex.Pattern.compile("(?m)^([0-9]{6})$").matcher(texto);
        assertTrue(padrao.find());
        String codigo = padrao.group(1);
        var persistido = recuperacoes.findById(hash(usuario.getId(), codigo)).orElseThrow();
        assertNotEquals(codigo, persistido.getHash());
        assertTrue(persistido.getExpiraEm().isAfter(Instant.now()));
        assertTrue(persistido.getExpiraEm().isBefore(Instant.now().plusSeconds(601)));
        String resposta = http.perform(post("/api/auth/validar-codigo-recuperacao").contentType("application/json")
                .content(codigo(usuario.getEmail(), codigo)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String autorizacao = tools.jackson.databind.json.JsonMapper.builder().build().readTree(resposta).path("autorizacao").asText();
        assertTrue(autorizacao.matches("[A-Za-z0-9_-]{43}"));
        persistido = recuperacoes.findById(hash(usuario.getId(), codigo)).orElseThrow();
        assertEquals(hash(usuario.getId(), "autorizacao:" + autorizacao), persistido.getHashAutorizacao());
        assertTrue(persistido.getAutorizacaoExpiraEm().isBefore(Instant.now().plusSeconds(301)));
        assertTrue(senhas.matches("SenhaOriginal123", usuarios.findById(usuario.getId()).orElseThrow().getSenhaHash()));
        http.perform(get("/api/usuarios/me").header("Authorization", jwt)).andExpect(status().isOk());
        http.perform(post("/api/auth/validar-codigo-recuperacao").contentType("application/json")
                .content(codigo(usuario.getEmail(), codigo))).andExpect(status().isBadRequest());
        var outraConta = conta("outra-conta");
        http.perform(post("/api/auth/redefinir-senha").contentType("application/json")
                .content(corpo(outraConta.getEmail(), autorizacao, "NaoPodeMudar123"))).andExpect(status().isBadRequest());
        http.perform(post("/api/auth/redefinir-senha").contentType("application/json")
                .content(corpo(usuario.getEmail(), autorizacao, "NovaSenhaSegura123")))
                .andExpect(status().isNoContent());
        assertTrue(senhas.matches("NovaSenhaSegura123", usuarios.findById(usuario.getId()).orElseThrow().getSenhaHash()));
        assertTrue(recuperacoes.findById(hash(usuario.getId(), codigo)).isEmpty());
        http.perform(get("/api/usuarios/me").header("Authorization", jwt)).andExpect(status().isUnauthorized());
        http.perform(post("/api/auth/redefinir-senha").contentType("application/json")
                .content(corpo(usuario.getEmail(), autorizacao, "OutraSenhaSegura123")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void contaInexistenteRecebeConfirmacaoSemInformarCadastro() throws Exception {
        var resposta = http.perform(post("/api/auth/esqueci-senha").contentType("application/json")
                .content("{\"email\":\"nao-existe@exemplo.com\"}"))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        assertTrue(resposta.contains("Se houver uma conta"));
        assertFalse(resposta.contains("token"));
    }

    @Test
    void codigoExpiradoOuSessaoRevogadaNaoPermiteTrocarSenha() throws Exception {
        for (boolean expirado : new boolean[] {true, false}) {
            var usuario = conta(expirado ? "expirado" : "revogado");
            String codigo = expirado ? "123456" : "654321";
            var recuperacao = new RecuperacaoSenha();
            recuperacao.setHash(hash(usuario.getId(), codigo)); recuperacao.setUsuario(usuario);
            recuperacao.setEmail(usuario.getEmail()); recuperacao.setVersaoSessao(usuario.versaoSessaoAtual());
            recuperacao.setExpiraEm(Instant.now().plusSeconds(expirado ? -10 : 1800));
            recuperacoes.saveAndFlush(recuperacao);
            if (!expirado) { usuario.revogarSessoes(); usuarios.saveAndFlush(usuario); }
            http.perform(post("/api/auth/validar-codigo-recuperacao").contentType("application/json")
                    .content(codigo(usuario.getEmail(), codigo)))
                    .andExpect(status().isBadRequest());
            assertTrue(senhas.matches("SenhaOriginal123", usuarios.findById(usuario.getId()).orElseThrow().getSenhaHash()));
        }
    }

    @Test
    void rejeitaSenhaCurtaCodigoInvalidoEExcessoDeSolicitacoes() throws Exception {
        http.perform(post("/api/auth/validar-codigo-recuperacao").contentType("application/json")
                .content(codigo("teste@exemplo.com", "invalido"))).andExpect(status().isBadRequest());
        http.perform(post("/api/auth/redefinir-senha").contentType("application/json")
                .content(corpo("teste@exemplo.com", "invalido", "123")))
                .andExpect(status().isBadRequest());
        for (int i = 0; i < 3; i++) http.perform(post("/api/auth/esqueci-senha").contentType("application/json")
                .content("{\"email\":\"limite@exemplo.com\"}"))
                .andExpect(status().isAccepted());
        http.perform(post("/api/auth/esqueci-senha").contentType("application/json")
                .content("{\"email\":\"limite@exemplo.com\"}"))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
    }

    private Usuario conta(String nome) {
        return usuarios.saveAndFlush(Usuario.builder().nome(nome).email(nome + "@exemplo.com")
                .senhaHash(senhas.encode("SenhaOriginal123")).perfil(PerfilUsuario.CLIENTE).build());
    }

    @Test
    void cincoErrosBloqueiamCodigoCorretoEContadorPermaneceGravado() throws Exception {
        var usuario = conta("limite-codigo");
        String codigo = "000007";
        var recuperacao = new RecuperacaoSenha();
        recuperacao.setHash(hash(usuario.getId(), codigo)); recuperacao.setUsuario(usuario);
        recuperacao.setEmail(usuario.getEmail()); recuperacao.setVersaoSessao(usuario.versaoSessaoAtual());
        recuperacao.setExpiraEm(Instant.now().plusSeconds(600));
        recuperacoes.saveAndFlush(recuperacao);
        for (int i = 0; i < 5; i++) {
            http.perform(post("/api/auth/validar-codigo-recuperacao").contentType("application/json")
                    .content(codigo(usuario.getEmail(), "000008")))
                    .andExpect(status().isBadRequest());
        }
        assertEquals(5, recuperacoes.findByUsuarioId(usuario.getId()).orElseThrow().getTentativas());
        http.perform(post("/api/auth/validar-codigo-recuperacao").contentType("application/json")
                .content(codigo(usuario.getEmail(), codigo)))
                .andExpect(status().isBadRequest());
        assertTrue(senhas.matches("SenhaOriginal123", usuarios.findById(usuario.getId()).orElseThrow().getSenhaHash()));
    }

    @Test
    void bloqueiaTrocaSemValidacaoOuComAutorizacaoExpirada() throws Exception {
        var usuario = conta("autorizacao-expirada");
        String autorizacao = "a".repeat(43);
        var recuperacao = new RecuperacaoSenha();
        recuperacao.setHash(hash(usuario.getId(), "123456")); recuperacao.setUsuario(usuario);
        recuperacao.setEmail(usuario.getEmail()); recuperacao.setVersaoSessao(usuario.versaoSessaoAtual());
        recuperacao.setExpiraEm(Instant.now().plusSeconds(600));
        recuperacoes.saveAndFlush(recuperacao);
        http.perform(post("/api/auth/redefinir-senha").contentType("application/json")
                .content(corpo(usuario.getEmail(), autorizacao, "NaoPodeMudar123"))).andExpect(status().isBadRequest());
        http.perform(post("/api/auth/redefinir-senha").contentType("application/json")
                .content("{\"email\":\"" + usuario.getEmail() + "\",\"codigo\":\"123456\",\"novaSenha\":\"NaoPodeMudar123\"}"))
                .andExpect(status().isBadRequest());
        recuperacao.setHashAutorizacao(hash(usuario.getId(), "autorizacao:" + autorizacao));
        recuperacao.setAutorizacaoExpiraEm(Instant.now().minusSeconds(1));
        recuperacoes.saveAndFlush(recuperacao);
        http.perform(post("/api/auth/redefinir-senha").contentType("application/json")
                .content(corpo(usuario.getEmail(), autorizacao, "NaoPodeMudar123"))).andExpect(status().isBadRequest());
        assertTrue(senhas.matches("SenhaOriginal123", usuarios.findById(usuario.getId()).orElseThrow().getSenhaHash()));
    }

    private String codigo(String email, String codigo) {
        return "{\"email\":\"" + email + "\",\"codigo\":\"" + codigo + "\"}";
    }

    private String corpo(String email, String autorizacao, String novaSenha) {
        return "{\"email\":\"" + email + "\",\"autorizacao\":\"" + autorizacao + "\",\"novaSenha\":\"" + novaSenha + "\"}";
    }

    private String hash(Long id, String codigo) throws Exception {
        var mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec("segredo-sintetico-exclusivo-teste-recuperacao".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(("recuperacao-senha:" + id + ":" + codigo).getBytes(StandardCharsets.UTF_8)));
    }
}
