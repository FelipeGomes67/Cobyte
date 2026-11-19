package com.labware.api.service;

import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClassificadorIaServiceTest {
    @ParameterizedTest
    @CsvSource(nullValues = "INDEFINIDA", value = {
            "O sistema inteiro caiu e nenhum usuário consegue acessar, INDISPONIBILIDADE, CRITICA",
            "Não consigo salvar a prescrição nesta tela, ERRO_FUNCIONAL, ALTA",
            "O token expirado impede meu acesso ao laudo, ACESSO, MEDIA",
            "Minha senha aparece como inválida apenas para mim e os colegas conseguem acessar, ACESSO, MEDIA",
            "A tela está lenta mas conclui a consulta, LENTIDAO, MEDIA",
            "O PDF tem erro de alinhamento na quebra de página, ERRO_FUNCIONAL, BAIXA",
            "Como faço para assinar um laudo?, DUVIDA, INDEFINIDA",
            "Solicitação de inclusão de um atalho para assinar laudos, MELHORIA, MELHORIA",
            "Urgente: erro no sistema, ERRO_FUNCIONAL, INDEFINIDA",
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
