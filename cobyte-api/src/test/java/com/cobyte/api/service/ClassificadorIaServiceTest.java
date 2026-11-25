package com.cobyte.api.service;

import com.cobyte.api.model.enums.CategoriaChamado;
import com.cobyte.api.model.enums.Prioridade;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClassificadorIaServiceTest {
    @ParameterizedTest
    @CsvSource(value = {
            "67, 67",
            "123, 456",
            "!!!, ???",
            "67, 🔧",
            "SEM_TITULO, 67"
    }, nullValues = "SEM_TITULO")
    void cancelaRelatoSemConteudoDescritivoSemConsultarModelo(String titulo, String descricao) {
        var chamadas = new AtomicInteger();
        var classificador = new ClassificadorIaService(ChatClient.builder(prompt -> {
            chamadas.incrementAndGet();
            throw new IllegalStateException("Modelo indisponível");
        }), new ObjectMapper(), 5000, 768);
        try {
            var resultado = classificador.classificar(titulo, descricao).orElseThrow();
            assertTrue(resultado.foraDoEscopo());
            assertTrue(resultado.motivoCancelamento().contains("apenas números ou símbolos"));
            assertNull(resultado.categoria());
            assertNull(resultado.prioridade());
            assertEquals(0, chamadas.get());
        } finally { classificador.encerrar(); }
    }

    @Test
    void contingenciaTambemCancelaRelatoSemConteudoDescritivo() {
        var classificador = new ClassificadorIaService(ChatClient.builder(prompt -> {
            throw new IllegalStateException("Modelo indisponível");
        }), new ObjectMapper(), 5000, 768);
        try {
            var resultado = classificador.emergencia("67", "67", "tempo limite da IA");
            assertTrue(resultado.foraDoEscopo());
            assertNull(resultado.categoria());
            assertNull(resultado.prioridade());
            assertTrue(resultado.motivoCancelamento().length() >= 10);
        } finally { classificador.encerrar(); }
    }

    @Test
    void pedidoDePersonalizacaoNaoViraDefeitoVisual() {
        String json = """
                {"foraDoEscopo":false,"informacoesInsuficientes":false,"informacoesFaltantes":"","motivoCancelamento":"",
                 "categoriaGeradaIa":"MELHORIA","prioridadeGeradaIa":"MELHORIA",
                 "tituloGeradoIa":"Personalização opcional das cores dos ícones",
                 "resumoTecnicoIa":{"sintomaObservado":"Usuário solicita escolher a cor do ícone.",
                    "impactoOperacional":"O botão continua funcionando normalmente."},
                 "justificativaIa":"Pedido de personalização sem defeito atual."}
                """;
        var resposta = new ChatResponse(List.of(new Generation(new AssistantMessage(json))));
        var classificador = new ClassificadorIaService(ChatClient.builder(prompt -> resposta), new ObjectMapper(), 5000, 768);
        try {
            var resultado = classificador.classificar("", "Gostaria de poder escolher a cor do ícone; o botão continua funcionando normalmente.").orElseThrow();
            assertEquals(CategoriaChamado.MELHORIA, resultado.categoria());
            assertEquals(Prioridade.MELHORIA, resultado.prioridade());
        } finally { classificador.encerrar(); }
    }

    @ParameterizedTest
    @CsvSource({
            "A cor do ícone ficou diferente; o botão continua funcionando., BAIXA",
            "A cor do ícone mudou; o botão funciona normalmente mas não consigo salvar a prescrição., ALTA",
            "A cor do ícone mudou; o botão funciona normalmente mas o sistema inteiro caiu., CRITICA"
    })
    void validaCoerenciaSemRebaixarRelatosComBloqueio(String relato, Prioridade esperada) {
        String json = """
                {"foraDoEscopo":false,"informacoesInsuficientes":false,"informacoesFaltantes":"","motivoCancelamento":"",
                 "categoriaGeradaIa":"ERRO_FUNCIONAL","prioridadeGeradaIa":"ALTA",
                 "tituloGeradoIa":"Alteração inesperada na aparência do ícone",
                 "resumoTecnicoIa":{"sintomaObservado":"A cor do ícone foi alterada.",
                    "impactoOperacional":"O botão continua funcionando normalmente."},
                 "justificativaIa":"Pode ser considerado uma melhoria para a estética do sistema."}
                """;
        var resposta = new ChatResponse(List.of(new Generation(new AssistantMessage(json))));
        var classificador = new ClassificadorIaService(ChatClient.builder(prompt -> resposta), new ObjectMapper(), 5000, 768);
        try {
            var resultado = classificador.classificar("", relato).orElseThrow();
            assertEquals(esperada, resultado.prioridade());
            if (esperada == Prioridade.BAIXA) {
                assertEquals(CategoriaChamado.ERRO_FUNCIONAL, resultado.categoria());
                assertTrue(resultado.justificativa().contains("[Revisão necessária]"));
                assertFalse(resultado.justificativa().contains("melhoria para a estética"));
                assertTrue(resultado.resumoTecnicoIa().impactoOperacional().contains("Funcionamento preservado"));
            }
        } finally { classificador.encerrar(); }
    }

    @ParameterizedTest
    @CsvSource(nullValues = "INDEFINIDA", value = {
            "O sistema inteiro caiu e nenhum usuário consegue acessar, INDISPONIBILIDADE, CRITICA",
            "Não consigo salvar a prescrição nesta tela, ERRO_FUNCIONAL, ALTA",
            "O token expirado impede meu acesso ao laudo, ACESSO, MEDIA",
            "Minha senha aparece como inválida apenas para mim e os colegas conseguem acessar, ACESSO, MEDIA",
            "A tela está lenta mas conclui a consulta, LENTIDAO, MEDIA",
            "O PDF tem erro de alinhamento na quebra de página, ERRO_FUNCIONAL, BAIXA",
            "A cor do ícone ficou diferente; o botão continua funcionando., ERRO_FUNCIONAL, BAIXA",
            "A cor do ícone mudou mas não consigo salvar a prescrição, ERRO_FUNCIONAL, ALTA",
            "A cor do ícone mudou e o sistema inteiro caiu, INDISPONIBILIDADE, CRITICA",
            "Como faço para assinar um laudo?, DUVIDA, INDEFINIDA",
            "Solicitação de inclusão de um atalho para assinar laudos, MELHORIA, MELHORIA",
            "Urgente: erro no sistema, ERRO_FUNCIONAL, INDEFINIDA",
            "O botão de assinar laudo simplesmente sumiu da tela. Preciso liberar o paciente da UTI urgente, ERRO_FUNCIONAL, CRITICA",
            "O botão de assinar laudo sumiu da tela e não consigo concluir a assinatura, ERRO_FUNCIONAL, ALTA",
            "Preciso de ajuda sem outros detalhes, INDEFINIDA, INDEFINIDA",
            "Erro 67 ao salvar prescrição, ERRO_FUNCIONAL, INDEFINIDA",
            "Erro 500, ERRO_FUNCIONAL, INDEFINIDA",
            "Como assinar laudo de UTI?, DUVIDA, INDEFINIDA",
            "Falha na impressora sem detalhes adicionais, ERRO_FUNCIONAL, INDEFINIDA"
    })
    void classificaPeloImpactoInformado(String descricao, CategoriaChamado categoria, Prioridade prioridade) {
        var classificador = new ClassificadorIaService(ChatClient.builder(prompt -> {
            throw new IllegalStateException("Modelo indisponível");
        }), new ObjectMapper(), 5000, 768);
        try {
            var resultado = classificador.classificar("", descricao).orElseThrow();
            assertEquals(categoria, resultado.categoria());
            assertEquals(prioridade, resultado.prioridade());
            assertFalse(resultado.foraDoEscopo());
        } finally {
            classificador.encerrar();
        }
    }

    @Test
    void preservaEvidenciaDeAcessoQuandoModeloDeixaCamposNulos() {
        String json = """
                {"foraDoEscopo":false,"categoriaGeradaIa":null,"prioridadeGeradaIa":null,
                 "informacoesInsuficientes":true,"justificativaIa":"Alcance a confirmar."}
                """;
        var resposta = new ChatResponse(List.of(new Generation(new AssistantMessage(json))));
        var classificador = new ClassificadorIaService(ChatClient.builder(prompt -> resposta),
                new ObjectMapper(), 5000, 768);
        try {
            var resultado = classificador.classificar("Acesso",
                    "Minha senha aparece como inválida apenas para mim. Os colegas conseguem acessar normalmente.").orElseThrow();
            assertEquals(CategoriaChamado.ACESSO, resultado.categoria());
            assertEquals(Prioridade.MEDIA, resultado.prioridade());
            assertTrue(resultado.justificativa().contains("[Revisão necessária]"));
            assertFalse(resultado.foraDoEscopo());
        } finally {
            classificador.encerrar();
        }
    }

    @Test
    void encaminhaClassificacaoCorrigidaParaRevisaoSemRepetirJustificativaContraditoria() {
        String json = """
                {
                  "informacoesInsuficientes": false,
                  "informacoesFaltantes": "",
                  "motivoCancelamento": "",
                  "foraDoEscopo": false,
                  "categoriaGeradaIa": "DUVIDA",
                  "prioridadeGeradaIa": "MEDIA",
                  "tituloGeradoIa": "Falha ao salvar uma prescrição",
                  "resumoTecnicoIa": {
                    "sintomaObservado": "A prescrição não é salva.",
                    "impactoOperacional": "O solicitante está impedido de salvar a prescrição."
                  },
                  "justificativaIa": "A operação funciona normalmente."
                }
                """;
        var respostaModelo = new ChatResponse(List.of(new Generation(new AssistantMessage(json))));
        var classificador = new ClassificadorIaService(
                ChatClient.builder(prompt -> respostaModelo), new ObjectMapper(), 5000, 768);
        try {
            var resultado = classificador.classificar("Prescrição", "Não consigo salvar a prescrição").orElseThrow();
            assertEquals(CategoriaChamado.ERRO_FUNCIONAL, resultado.categoria());
            assertEquals(Prioridade.ALTA, resultado.prioridade());
            assertTrue(resultado.justificativa().contains("[Revisão necessária]"));
            assertFalse(resultado.justificativa().contains("funciona normalmente"));
            assertEquals("Falha ao salvar uma prescrição", resultado.tituloGeradoIa());
        } finally {
            classificador.encerrar();
        }
    }
}
