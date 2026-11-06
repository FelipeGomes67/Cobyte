package com.labware.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;


import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "IA — laboratório", description = "Rotas experimentais exclusivas de ADMIN, sem persistência de triagem.")
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*") // Permite requisições do frontend React
public class AiController {

    private final ChatModel chatModel;

    public AiController(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    /**
     * Endpoint de teste direto para conversar com o modelo local
     */
    @Operation(summary = "Conversar com o modelo local", description = "Somente ADMIN. Chama diretamente o modelo Ollama e retorna resposta textual.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @GetMapping("/generate")
    public Map<String, String> generate(@RequestParam(defaultValue = "Olá, quem é você?") String message) {
        String response = chatModel.call(message);
        return Map.of("resposta", response);
    }

    /**
     * Endpoint com aplicação real no LABWARE: Classificação de Chamados
     */
    @Operation(summary = "Classificar descrição no laboratório", description = "Somente ADMIN. Body com descricao. Retorna descricao_recebida e analise_ia textual; não atualiza chamados.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Operação realizada com sucesso"),
            @ApiResponse(responseCode = "400", ref = "#/components/responses/DadosInvalidos"),
            @ApiResponse(responseCode = "401", ref = "#/components/responses/NaoAutenticado"),
            @ApiResponse(responseCode = "403", ref = "#/components/responses/AcessoNegado"),
            @ApiResponse(responseCode = "500", ref = "#/components/responses/ErroInterno")
    })
    @PostMapping("/classificar-chamado")
    public Map<String, String> classificarChamado(@RequestBody Map<String, String> payload) {
        String descricao = payload.get("descricao");

        String promptInstrucao = """
                Você é o sistema especialista de triagem do LABWARE.
                            Sua missão é analisar o relato do usuário e transformar em um chamado técnico bem estruturado.
                
                            Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos de código Markdown como ```json) com as seguintes chaves:
                
                            1. "titulo": Crie um título padronizado no formato "[Módulo] + Sintoma + Contexto" (ex: "[PATOLOGIA] Falha ao renderizar filtro de resultados").
                            2. "descricao": Formate e limpe a descrição original para torná-la mais profissional, corrigindo gramática básica se necessário, mas mantendo a intenção original.
                            3. "categoria": Analise o contexto do chamado e infira uma categoria curta, direta e em letras MAIÚSCULAS que represente o domínio, tecnologia ou módulo afetado. Não há uma lista pré-definida, use sua interpretação. (Exemplos possíveis: "BANCO DE DADOS", "PATOLOGIA", "FATURAMENTO", "INFRAESTRUTURA", "RELATÓRIOS", "INTEGRAÇÃO").
                            4. "prioridade": Escolha ESTRITAMENTE entre: "MELHORIA", "BAIXA", "MEDIA", "ALTA", "CRITICA".
                               - ATENÇÃO: Se o relato mencionar palavras como "Sugestão", "Implementação", "Adicionar novo", a prioridade OBRIGATORIAMENTE deve ser "MELHORIA".
                            5. "justificativa": Uma frase técnica (max 2 linhas) justificando a escolha da categoria e prioridade.
                
                            Relato original do usuário a ser analisado:
            """ + descricao;

        String respostaIA = chatModel.call(new Prompt(promptInstrucao)).getResult().getOutput().getText();

        return Map.of(
                "descricao_recebida", descricao,
                "analise_ia", respostaIA
        );
    }
}