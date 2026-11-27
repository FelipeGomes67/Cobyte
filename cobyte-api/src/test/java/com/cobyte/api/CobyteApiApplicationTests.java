package com.cobyte.api;

import com.cobyte.api.model.entity.Anexo;
import com.cobyte.api.model.entity.Chamado;
import com.cobyte.api.model.entity.Empresa;
import com.cobyte.api.model.entity.Mensagem;
import com.cobyte.api.model.entity.Usuario;
import com.cobyte.api.model.enums.PerfilUsuario;
import com.cobyte.api.model.enums.StatusChamado;
import com.cobyte.api.repository.AnexoRepository;
import com.cobyte.api.repository.ChamadoRepository;
import com.cobyte.api.repository.EmpresaRepository;
import com.cobyte.api.repository.MensagemRepository;
import com.cobyte.api.repository.UsuarioRepository;
import com.cobyte.api.service.ClassificadorIaService;
import com.cobyte.api.service.TokenService;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "cobyte.jwt.secret=chave-sintetica-exclusiva-de-testes-jwt",
    "spring.datasource.url=jdbc:h2:mem:cobyte-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "cobyte.uploads.armazenamento=banco"
})
@AutoConfigureMockMvc
@Transactional
class CobyteApiApplicationTests {
    @Autowired MockMvc http;
    @Autowired UsuarioRepository usuarios;
    @Autowired jakarta.persistence.EntityManager entidades;
    @Autowired EmpresaRepository empresas;
    @Autowired ChamadoRepository chamados;
    @Autowired AnexoRepository anexos;
    @Autowired MensagemRepository mensagens;
    @Autowired com.cobyte.api.repository.NotificacaoRepository notificacoes;
    @Autowired TokenService tokens;
    @MockitoBean ClassificadorIaService classificador;
    @MockitoBean com.cobyte.api.service.TranscricaoService transcritor;

    @Test
    void fotoEnviadaPermaneceNoPerfilENoArmazenamentoAposRecarregar() throws Exception {
        var autor = usuario("foto-persistida", PerfilUsuario.CLIENTE, empresa("00000000000098"));
        String token = bearer(autor);
        String ultimaUrl = null;
        for (int cor : new int[] {0xff336699, 0xffcc5522}) {
            var imagem = new java.awt.image.BufferedImage(2, 2, java.awt.image.BufferedImage.TYPE_INT_RGB);
            imagem.setRGB(0, 0, cor);
            var bytes = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(imagem, "png", bytes);
            var foto = new MockMultipartFile("foto", "perfil.png", "image/png", bytes.toByteArray());
            http.perform(multipart("/api/usuarios/me/foto").file(foto).header("Authorization", token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("fotoPerfil").isNotEmpty());
            entidades.flush();
            entidades.clear();
            var persistido = usuarios.findById(autor.getId()).orElseThrow();
            String url = persistido.getFotoPerfil();
            assertNotEquals(ultimaUrl, url);
            http.perform(get("/api/usuarios/me").header("Authorization", token))
                    .andExpect(status().isOk()).andExpect(jsonPath("fotoPerfil").value(url));
            var download = http.perform(get(url)).andExpect(status().isOk())
                    .andExpect(content().contentType("image/png")).andReturn().getResponse().getContentAsByteArray();
            var recarregada = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(download));
            assertEquals(cor, recarregada.getRGB(0, 0));
            ultimaUrl = url;
        }
    }

    @Test
    void pdfComSqlEScriptPermaneceDadoSemExecutarNoBanco() throws Exception {
        var empresa = empresa("00000000000001");
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa);
        var colega = usuario("colega", PerfilUsuario.CLIENTE, empresa);
        var externo = usuario("externo", PerfilUsuario.CLIENTE, empresa("00000000000002"));
        var chamado = chamado(autor, empresa);
        long usuariosAntes = usuarios.count(), chamadosAntes = chamados.count();
        byte[] conteudo = ("%PDF-1.7\n'; DROP TABLE usuario; --\n<script>window.__teste=true</script>\n"
                + "<img src=x onerror=alert('teste')>\nSELECT * FROM usuario WHERE '1'='1';")
                .getBytes(StandardCharsets.UTF_8);
        var arquivo = new MockMultipartFile("arquivo", "relato'; DELETE FROM usuario;--.pdf", "application/pdf", conteudo);
        String rota = "/api/chamados/" + chamado.getIdPublico() + "/anexos";
        var resultado = http.perform(multipart(rota).file(arquivo).header("Authorization", bearer(autor)))
                .andExpect(status().isCreated()).andReturn();
        assertEquals(usuariosAntes, usuarios.count());
        assertEquals(chamadosAntes, chamados.count());
        var anexo = anexos.findByChamadoIdOrderByEnviadoEmAscIdAsc(chamado.getId()).get(0);
        String download = "/api/chamados/anexos/" + anexo.getId() + "/download";
        http.perform(get(download)).andExpect(status().isUnauthorized());
        http.perform(get(download).header("Authorization", bearer(externo))).andExpect(status().isForbidden());
        http.perform(get(download).header("Authorization", bearer(colega)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/octet-stream"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment;")))
                .andExpect(content().bytes(conteudo));
        assertEquals(usuariosAntes, usuarios.count());
        assertEquals(chamadosAntes, chamados.count());
        org.junit.jupiter.api.Assertions.assertFalse(resultado.getResponse().getContentAsString().contains("db:anexos/"));
    }

    @Test
    void uploadSemLoginOuPorOutraEmpresaNaoGravaAnexo() throws Exception {
        var empresa = empresa("00000000000001");
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa);
        var externo = usuario("externo", PerfilUsuario.CLIENTE, empresa("00000000000002"));
        var chamado = chamado(autor, empresa);
        var arquivo = new MockMultipartFile("arquivo", "relato.txt", "text/plain", "texto".getBytes(StandardCharsets.UTF_8));
        String rota = "/api/chamados/" + chamado.getIdPublico() + "/anexos";
        long antes = anexos.count();
        http.perform(multipart(rota).file(arquivo)).andExpect(status().isUnauthorized());
        http.perform(multipart(rota).file(arquivo).header("Authorization", bearer(externo)))
                .andExpect(status().isForbidden());
        assertEquals(antes, anexos.count());
    }

    @Test
    void quarentenaBloqueiaRecursosOperacionaisMasMantemPerfilEAprovacaoAtualizada() throws Exception {
        var pendente = usuario("pendente", PerfilUsuario.CLIENTE, null);
        String token = bearer(pendente);
        http.perform(get("/api/usuarios/me").header("Authorization", token)).andExpect(status().isOk());
        for (String rota : new String[] {"/api/chamados", "/api/notificacoes", "/api/push/config", "/api/usuarios/pendentes"}) {
            http.perform(get(rota).header("Authorization", token)).andExpect(status().isForbidden());
        }
        pendente.setEmpresa(empresa("00000000000003"));
        usuarios.saveAndFlush(pendente);
        http.perform(get("/api/notificacoes").header("Authorization", token)).andExpect(status().isOk());
        pendente.revogarSessoes();
        usuarios.saveAndFlush(pendente);
        http.perform(get("/api/usuarios/me").header("Authorization", token)).andExpect(status().isUnauthorized());
    }

    @Test
    void uploadRecusaFormatosForaDaListaMesmoComMimePermitido() throws Exception {
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa("00000000000001"));
        var chamado = chamado(autor, autor.getEmpresa());
        for (String nome : new String[] {"relato.txt", "relato.doc", "relato.docx", "imagem.gif", "audio.wav", "pagina.svg"}) {
            var arquivo = new MockMultipartFile("arquivo", nome, "image/png", "%PDF-1.7\nconteudo".getBytes(StandardCharsets.UTF_8));
            http.perform(multipart("/api/chamados/" + chamado.getIdPublico() + "/anexos")
                    .file(arquivo).header("Authorization", bearer(autor))).andExpect(status().isUnsupportedMediaType());
        }
    }

    @Test
    void notificacoesDaEmpresaAnteriorNaoPodemSerLidasOuMarcadas() throws Exception {
        var empresaAntiga = empresa("00000000000001");
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresaAntiga);
        var chamadoAntigo = chamado(autor, empresaAntiga);
        var antiga = notificacoes.saveAndFlush(com.cobyte.api.model.entity.Notificacao.builder()
                .usuario(autor).chamado(chamadoAntigo).titulo("Antiga").mensagem("Privado").tipo("MENSAGEM").build());
        autor.setEmpresa(empresa("00000000000002"));
        usuarios.saveAndFlush(autor);
        var atual = notificacoes.saveAndFlush(com.cobyte.api.model.entity.Notificacao.builder()
                .usuario(autor).titulo("Atual").mensagem("Conta").tipo("APROVACAO_CADASTRO").build());
        http.perform(get("/api/notificacoes").header("Authorization", bearer(autor)))
                .andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Privado"))));
        http.perform(put("/api/notificacoes/" + antiga.getId() + "/lida").header("Authorization", bearer(autor)))
                .andExpect(status().isNotFound());
        http.perform(put("/api/notificacoes/marcar-todas-lidas").header("Authorization", bearer(autor)))
                .andExpect(status().isNoContent());
        assertEquals(false, notificacoes.findById(antiga.getId()).orElseThrow().isLida());
        // A atualização em lote não sincroniza instâncias já presentes no contexto JPA.
        assertEquals(0, notificacoes.contarNaoLidasVisiveis(autor.getId(), true));
        assertEquals(1, notificacoes.countByUsuarioIdAndLidaFalse(autor.getId()));
    }

    @Test
    void transcricaoMantemAudioNoFluxoEspecificoSemLiberarUploadGenerico() throws Exception {
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa("00000000000001"));
        var chamado = chamado(autor, autor.getEmpresa());
        var audio = new MockMultipartFile("arquivo", "relato.wav", "audio/wav", new byte[] {82,73,70,70,0,0,0,0,87,65,86,69});
        when(transcritor.transcreverAudio(org.mockito.ArgumentMatchers.any())).thenReturn(
                new com.cobyte.api.dto.response.TranscricaoResponse("relato.wav", 1.0, "pt", 1.0, "Falha no sistema"));
        http.perform(multipart("/api/chamados/" + chamado.getIdPublico() + "/transcrever-audio")
                .file(audio).param("salvarAnexo", "true").param("salvarMensagem", "false")
                .header("Authorization", bearer(autor))).andExpect(status().isOk());
        assertEquals("audio/wav", anexos.findByChamadoIdOrderByEnviadoEmAscIdAsc(chamado.getId()).get(0).getTipoConteudo());
    }

    @Test
    void binarioRenomeadoParaTxtEExecutavelNaoSaoArmazenados() throws Exception {
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa("00000000000001"));
        var chamado = chamado(autor, autor.getEmpresa());
        String rota = "/api/chamados/" + chamado.getIdPublico() + "/anexos";
        long antes = anexos.count();
        for (String nome : new String[] {"programa.txt", "foto.jpg.exe", "pagina.html", "script.svg", "script.docm"}) {
            var arquivo = new MockMultipartFile("arquivo", nome, "image/png", new byte[] {77, 90, 0, 0});
            http.perform(multipart(rota).file(arquivo).header("Authorization", bearer(autor)))
                    .andExpect(status().isUnsupportedMediaType());
        }
        assertEquals(antes, anexos.count());
    }

    @Test
    void aberturaGeraProtocolosAleatoriosDistintosEPreservaOLegado() throws Exception {
        var empresa = empresa("00000000000001");
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa);
        var legado = chamado(autor, empresa);
        var dados = new MockMultipartFile("chamado", "chamado.json", "application/json",
                "{\"titulo\":\"Teste de abertura\",\"descricao\":\"Relato de teste\"}".getBytes(StandardCharsets.UTF_8));
        var png = Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1YAAAAASUVORK5CYII=");
        var arquivo = new MockMultipartFile("arquivos", "evidencia.png", "image/png", png);
        when(classificador.classificar("Teste de abertura", "Relato de teste")).thenReturn(Optional.empty());
        String rota = "/api/chamados";

        for (int i = 0; i < 2; i++) {
            http.perform(multipart(rota).file(dados).file(arquivo).servletPath(rota)
                            .header("Authorization", bearer(autor)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.protocolo", matchesPattern("^LAB-(?:[A-Z0-9]{4}-){2}[A-Z0-9]{4}$")));
        }

        var novos = chamados.findBySolicitanteIdAndEmpresaIdOrderByAbertoEmDesc(autor.getId(), empresa.getId())
                .stream().filter(c -> !c.getId().equals(legado.getId())).toList();
        assertEquals(2, novos.size());
        assertNotEquals(novos.get(0).getProtocolo(), novos.get(1).getProtocolo());
        assertNotEquals(novos.get(0).getIdPublico(), novos.get(1).getIdPublico());
        assertEquals("LAB-TESTE-0001", chamados.findById(legado.getId()).orElseThrow().getProtocolo());
    }

    @Test
    void colegaDaEmpresaPodeEnviarMensagemECancelarRegistrandoSuaIdentidade() throws Exception {
        var empresa = empresa("00000000000001");
        var outraEmpresa = empresa("00000000000002");
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa);
        var colega = usuario("colega", PerfilUsuario.CLIENTE, empresa);
        var externo = usuario("externo", PerfilUsuario.CLIENTE, outraEmpresa);
        var chamado = chamado(autor, empresa);
        String rota = "/api/chamados/" + chamado.getIdPublico();

        http.perform(get(rota)).andExpect(status().isUnauthorized());
        http.perform(get(rota).header("Authorization", bearer(colega)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(chamado.getIdPublico().toString()));
        long antes = mensagens.count();
        http.perform(post(rota + "/mensagens").header("Authorization", bearer(externo))
                .contentType("application/json").content("{\"conteudo\":\"Mensagem de teste\"}"))
                .andExpect(status().isForbidden());
        String cancelamento = "{\"novoStatus\":\"CANCELADO\",\"motivoCancelamento\":\"Serviço não necessário\"}";
        http.perform(patch(rota + "/status").header("Authorization", bearer(externo))
                .contentType("application/json").content(cancelamento))
                .andExpect(status().isForbidden());
        assertEquals(antes, mensagens.count());
        assertEquals(StatusChamado.ABERTO, chamado.getStatus());

        http.perform(post(rota + "/mensagens").header("Authorization", bearer(colega))
                .contentType("application/json").content("{\"conteudo\":\"Mensagem de teste\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.chamadoId").value(chamado.getIdPublico().toString()))
                .andExpect(jsonPath("$.usuarioId").value(colega.getId().intValue()));
        assertEquals(antes + 1, mensagens.count());

        http.perform(patch(rota + "/prioridade").header("Authorization", bearer(colega))
                .contentType("application/json").content("{\"novaPrioridade\":\"ALTA\"}"))
                .andExpect(status().isForbidden());
        http.perform(patch(rota + "/status").header("Authorization", bearer(colega))
                .contentType("application/json").content(cancelamento))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADO"))
                .andExpect(jsonPath("$.canceladoPorId").value(colega.getId().intValue()))
                .andExpect(jsonPath("$.solicitanteId").value(autor.getId().intValue()));
    }

    @Test
    void colegaPodeConfirmarResolucaoOuReabrirChamadoResolvido() throws Exception {
        var empresa = empresa("00000000000001");
        var autor = usuario("autor", PerfilUsuario.CLIENTE, empresa);
        var colega = usuario("colega", PerfilUsuario.CLIENTE, empresa);
        var chamado = chamado(autor, empresa);
        var outro = chamados.saveAndFlush(Chamado.builder().protocolo("LAB-TESTE-0002")
                .titulo("Outro chamado de teste").descricao("Validação de fechamento")
                .categoria(com.cobyte.api.model.enums.CategoriaChamado.ERRO_FUNCIONAL)
                .prioridade(com.cobyte.api.model.enums.Prioridade.MEDIA)
                .solicitante(autor).empresa(empresa).status(StatusChamado.RESOLVIDO).build());
        chamado.setCategoria(com.cobyte.api.model.enums.CategoriaChamado.ERRO_FUNCIONAL);
        chamado.setPrioridade(com.cobyte.api.model.enums.Prioridade.MEDIA);
        chamado.setStatus(StatusChamado.RESOLVIDO);
        chamados.saveAndFlush(chamado);
        String auth = bearer(colega);

        http.perform(post("/api/chamados/" + chamado.getIdPublico() + "/reabrir").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("EM_ATENDIMENTO"));
        http.perform(patch("/api/chamados/" + outro.getIdPublico() + "/status").header("Authorization", auth)
                .contentType("application/json").content("{\"novoStatus\":\"FECHADO\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FECHADO"));
    }

    @Test
    void empresaAtualLimitaLeituraEIdentificadorNumericoNaoEPublico() throws Exception {
        var antiga = empresa("00000000000001");
        var atual = empresa("00000000000002");
        var autor = usuario("autor", PerfilUsuario.CLIENTE, antiga);
        var chamado = chamado(autor, antiga);
        autor.setEmpresa(atual);
        usuarios.saveAndFlush(autor);
        String auth = bearer(autor);

        http.perform(get("/api/chamados/" + chamado.getIdPublico()).header("Authorization", auth))
                .andExpect(status().isForbidden());
        http.perform(get("/api/chamados/" + chamado.getId()).header("Authorization", auth))
                .andExpect(status().isBadRequest());
        http.perform(get("/api/chamados/empresa/" + antiga.getId()).header("Authorization", auth))
                .andExpect(status().isForbidden());
    }

    @Test
    void administracaoExigeAdminESessaoRevogadaRecebe401() throws Exception {
        var cliente = usuario("cliente", PerfilUsuario.CLIENTE, empresa("00000000000001"));
        var suporte = usuario("tecnico", PerfilUsuario.SUPORTE, null);
        var admin = usuario("admin", PerfilUsuario.ADMIN, null);
        String rota = "/api/admin/usuarios";
        http.perform(get(rota).header("Authorization", bearer(cliente))).andExpect(status().isForbidden());
        http.perform(get(rota).header("Authorization", bearer(suporte))).andExpect(status().isForbidden());
        String tokenAntigo = bearer(admin);
        http.perform(get(rota).header("Authorization", tokenAntigo)).andExpect(status().isOk());
        admin.revogarSessoes();
        usuarios.saveAndFlush(admin);
        http.perform(get(rota).header("Authorization", tokenAntigo)).andExpect(status().isUnauthorized());
    }

    @Test
    void clienteNaoRecebeAnexoDeNotaInterna() throws Exception {
        var empresa = empresa("00000000000001");
        var cliente = usuario("cliente", PerfilUsuario.CLIENTE, empresa);
        var tecnico = usuario("tecnico", PerfilUsuario.SUPORTE, null);
        var chamado = chamado(cliente, empresa);
        var anexo = anexos.saveAndFlush(Anexo.builder().chamado(chamado).usuario(tecnico)
                .nomeArquivo("interno.pdf").tipoConteudo("application/pdf")
                .caminhoArquivo("arquivo-sintetico").tamanhoBytes(50L).build());
        mensagens.saveAndFlush(Mensagem.builder().chamado(chamado).usuario(tecnico).anexo(anexo)
                .conteudo("Nota sintética").visivelApenasSuporte(true).build());

        String rota = "/api/chamados/" + chamado.getIdPublico() + "/anexos";
        http.perform(get(rota).header("Authorization", bearer(cliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        http.perform(get(rota).header("Authorization", bearer(tecnico)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(anexo.getId().intValue()));
        http.perform(get("/api/chamados/anexos/" + anexo.getId() + "/download")
                .header("Authorization", bearer(cliente))).andExpect(status().isNotFound());
    }

    @Test
    void limiteDeLoginRetorna429EInformaEspera() throws Exception {
        String rota = "/api/auth/login";
        String dados = "{\"email\":\"teste-limite@example.com\",\"senha\":\"senha-sintetica\"}";
        for (int i = 0; i < 6; i++) {
            http.perform(post(rota).servletPath(rota).contentType("application/json").content(dados))
                    .andExpect(status().isUnauthorized());
        }
        http.perform(post(rota).servletPath(rota).contentType("application/json").content(dados))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
    }

    private String bearer(Usuario usuario) {
        return "Bearer " + tokens.gerar(usuario).valor();
    }

    private Empresa empresa(String cnpj) {
        return empresas.saveAndFlush(Empresa.builder().nome("Empresa de teste").cnpj(cnpj).build());
    }

    private Usuario usuario(String nome, PerfilUsuario perfil, Empresa empresa) {
        return usuarios.saveAndFlush(Usuario.builder().nome(nome).email(nome + "@example.com")
                .senhaHash("valor-sintetico").perfil(perfil).empresa(empresa).build());
    }

    private Chamado chamado(Usuario autor, Empresa empresa) {
        return chamados.saveAndFlush(Chamado.builder().protocolo("LAB-TESTE-0001").titulo("Chamado de teste")
                .descricao("Descrição sintética para validar autorização").solicitante(autor).empresa(empresa).build());
    }
}
