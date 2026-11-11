package com.labware.api.service;

import com.labware.api.dto.response.ClassificacaoIaResultadoReponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
public class ClassificadorIaService {

    private static final String INSTRUCAO = """
            Você é um classificador de chamados de suporte técnico laboratorial (sistema LABWARE).
            Analise o relato e retorne APENAS o JSON abaixo, sem markdown, sem comentários.

            Categorias válidas: INDISPONIBILIDADE, ERRO_FUNCIONAL, LENTIDAO, ACESSO, DUVIDA, MELHORIA.
            Prioridades válidas: CRITICA, ALTA, MEDIA, BAIXA, MELHORIA.

            Regras de prioridade (use apenas impacto EVIDENCIADO no relato):
            - CRITICA: sistema/setor inteiro parado ou laudos de UTI bloqueados.
            - ALTA: funcionalidade importante prejudicada, sem bloqueio total confirmado.
            - MEDIA: falha parcial, dúvida ou impacto limitado a um usuário/recurso.
            - BAIXA: ajuste visual ou melhoria de usabilidade de baixo impacto.
            - MELHORIA: evolução solicitada sem incidente ativo (use categoria MELHORIA também).
            - Relato insuficiente: use MEDIA e informe que o alcance precisa ser confirmado.
            - tecnicoSugeridoId: sempre null.
            - justificativaIa: 100-2000 chars; mencione "Categoria: X", "Prioridade: Y" e "SLA: Z".
            - SLA obrigatório: CRITICA 2h (120 min), ALTA 4h (240 min), MEDIA 12h (720 min), BAIXA 48h (2880 min), MELHORIA sem SLA.
            - tituloGeradoIa: 16-255 chars, formato "[Módulo] Descrição técnica do sintoma"; nunca copie o título original.
            - sintomaObservado e impactoOperacional: mínimo 10 chars cada; descreva fatos relatados, não invente.

            Exemplo:
            Entrada: "Impressora do laudo parou"
            Saída: {"tituloGeradoIa":"[Impressora/Laudos] Falha de comunicação impede impressão de laudos","resumoTecnicoIa":{"sintomaObservado":"Impressora sem resposta no setor de laudos.","impactoOperacional":"Impressão de laudos interrompida; alcance total não confirmado."},"categoriaGeradaIa":"ERRO_FUNCIONAL","prioridadeGeradaIa":"ALTA","justificativaIa":"Categoria: ERRO_FUNCIONAL — impressora sem resposta relatada pelo solicitante. Prioridade: ALTA — operação de impressão prejudicada, sem confirmação de bloqueio total do setor. SLA: 4h — política para ALTA prevê 240 minutos de resolução.","tecnicoSugeridoId":null}

            Retorne estritamente o JSON do contrato, bem formado, fechando todas as chaves.
            """;

    private static final String INSTRUCAO_CURTA = """
            Você é um classificador de chamados de suporte técnico laboratorial.
            Analise o relato e retorne APENAS um JSON estritamente com as chaves:
            {"categoriaGeradaIa":"<CATEGORIA>","prioridadeGeradaIa":"<PRIORIDADE>"}

            Categorias permitidas: INDISPONIBILIDADE, ERRO_FUNCIONAL, LENTIDAO, ACESSO, DUVIDA, MELHORIA.
            Prioridades permitidas: CRITICA, ALTA, MEDIA, BAIXA, MELHORIA.

            Regras rápidas:
            - CRITICA: sistema ou setor totalmente inoperante / laudos travados.
            - ALTA: funcionalidade importante com falha.
            - MEDIA: falha parcial, dúvida ou impacto individual.
            - BAIXA: ajuste visual ou melhoria menor.
            - MELHORIA: solicitação de nova funcionalidade.

            Responda APENAS o JSON fechado, sem markdown e sem nenhum texto antes ou depois.
            """;

    private final ChatClient chatClient;

    public ClassificadorIaService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public Optional<ClassificacaoIaResultadoReponse> classificar(String titulo, String descricao) {
        if (Thread.currentThread().isInterrupted()) {
            log.debug("Classificação IA cancelada antes do processamento (thread interrompida).");
            return Optional.of(fallbackPadrao());
        }

        String conteudo = "Título: " + titulo + "\nDescrição: " + descricao;

        // -----------------------------------------------------------------
        // TENTATIVA 1 (Enriquecida): Prompt completo buscando JSON detalhado
        // -----------------------------------------------------------------
        try {
            var resultado = chatClient.prompt()
                    .options(org.springframework.ai.ollama.api.OllamaChatOptions.builder()
                            .temperature(0.1)
                            .format("json")
                            .numCtx(2048)
                            .numPredict(384))
                    .system(INSTRUCAO)
                    .user(u -> u.text("{chamado}").param("chamado", conteudo))
                    .call().entity(ClassificacaoIaResultadoReponse.class);

            if (Thread.currentThread().isInterrupted()) {
                log.debug("Classificação IA cancelada após tentativa 1 (thread interrompida).");
                return Optional.of(fallbackPadrao());
            }

            if (resultadoValido(resultado, titulo, descricao)) {
                return Optional.of(resultado);
            }

            // REAPROVEITAMENTO PARCIAL: Se a validação estrita falhar mas categoria e prioridade existirem
            if (resultado != null && resultado.categoria() != null && resultado.prioridade() != null) {
                log.debug("Triagem IA com enriquecimento incompleto; preservando classificação básica parcial: {} / {}",
                        resultado.categoria(), resultado.prioridade());
                return Optional.of(basica(resultado.prioridade(), resultado.categoria()));
            }
        } catch (Exception e) {
            boolean interrompida = Thread.currentThread().isInterrupted();
            log.debug("Tentativa 1 enriquecida falhou (interrompida={}): {}. Acionando tentativa 2 de emergência.",
                    interrompida, e.getMessage());
        }

        if (Thread.currentThread().isInterrupted()) {
            return Optional.of(fallbackPadrao());
        }

        // -----------------------------------------------------------------
        // TENTATIVA 2 (Prompt Curto de Emergência): Solicita APENAS categoria e prioridade
        // -----------------------------------------------------------------
        try {
            log.debug("Executando tentativa 2 de emergência (prompt curto)");
            var resultadoCurto = chatClient.prompt()
                    .options(org.springframework.ai.ollama.api.OllamaChatOptions.builder()
                            .temperature(0.0)
                            .format("json")
                            .numCtx(1024)
                            .numPredict(256))
                    .system(INSTRUCAO_CURTA)
                    .user(u -> u.text("{chamado}").param("chamado", conteudo))
                    .call().entity(ClassificacaoIaResultadoReponse.class);

            if (Thread.currentThread().isInterrupted()) {
                return Optional.of(fallbackPadrao());
            }

            if (resultadoCurto != null && resultadoCurto.categoria() != null && resultadoCurto.prioridade() != null) {
                log.info("Triagem de emergência concluída com sucesso: {} / {}",
                        resultadoCurto.categoria(), resultadoCurto.prioridade());
                return Optional.of(basica(resultadoCurto.prioridade(), resultadoCurto.categoria()));
            }
        } catch (Exception e) {
            log.warn("Tentativa 2 (prompt curto) também falhou: {}. Aplicando fallback final.", e.getMessage());
        }

        // -----------------------------------------------------------------
        // FALLBACK FINAL: Classificação padrão garantida (Prioridade MEDIA e Categoria DUVIDA)
        // -----------------------------------------------------------------
        return Optional.of(fallbackPadrao());
    }

    private ClassificacaoIaResultadoReponse fallbackPadrao() {
        return new ClassificacaoIaResultadoReponse(
                com.labware.api.model.enums.Prioridade.MEDIA,
                com.labware.api.model.enums.CategoriaChamado.DUVIDA,
                "Triagem padrão aplicada devido a indisponibilidade/falha de resposta da IA.",
                null,
                null,
                null
        );
    }

    public record ClassificacaoBasica(com.labware.api.model.enums.Prioridade prioridadeGeradaIa,
                                      com.labware.api.model.enums.CategoriaChamado categoriaGeradaIa) {}

    private ClassificacaoIaResultadoReponse basica(com.labware.api.model.enums.Prioridade prioridade,
                                                   com.labware.api.model.enums.CategoriaChamado categoria) {
        return new ClassificacaoIaResultadoReponse(prioridade,categoria,
                "Categoria e prioridade identificadas pela IA. Enriquecimento técnico indisponível nesta tentativa; refaça a triagem para obter título, resumo e justificativa detalhados.",null,null,null);
    }

    static boolean resultadoValido(ClassificacaoIaResultadoReponse r, String titulo, String descricao) {
        if(r==null || r.prioridade()==null || r.categoria()==null || r.tecnicoSugeridoId()!=null) return false;
        String t=r.tituloGeradoIa();
        if(t==null || t.length()>255 || t.length()<16 || !t.matches("\\[[^\\]\\r\\n]{2,80}]\\s+\\S[^\\r\\n]+")) return false;
        String normalizado=normalizar(t);
        String primeiraFrase=descricao==null?"":descricao.split("[.!?\\r\\n]",2)[0];
        String semModulo=normalizar(t.replaceFirst("^\\[[^]]+]\\s*", ""));
        if(normalizado.equals(normalizar(titulo)) || normalizado.equals(normalizar(primeiraFrase))
                || semModulo.equals(normalizar(titulo)) || semModulo.equals(normalizar(primeiraFrase))) return false;
        var resumo=r.resumoTecnicoIa();
        if(resumo==null || !textoValido(resumo.sintomaObservado(),10,2000)
                || !textoValido(resumo.impactoOperacional(),10,2000)) return false;
        if(!textoValido(r.justificativa(),100,2000)) return false;
        String justificativa=normalizar(r.justificativa());
        if(!justificativa.contains("categoria "+normalizar(r.categoria().name()))
                || !justificativa.contains("prioridade "+normalizar(r.prioridade().name()))
                || !justificativa.contains("sla ") || justificativa.contains("com base na mensagem")) return false;
        Integer minutos=r.prioridade().minutosResolucao();
        if(minutos==null) return justificativa.contains("sem sla");
        return java.util.regex.Pattern.compile("\\b"+(minutos/60)+"\\s*(h|horas?)\\b|\\b"+minutos+"\\s*(min|minutos?)\\b")
                .matcher(justificativa).find();
    }

    private static boolean textoValido(String texto,int min,int max) {
        return texto!=null && texto.trim().length()>=min && texto.length()<=max;
    }
    private static String normalizar(String texto) {
        if(texto==null)return "";
        return java.text.Normalizer.normalize(texto,java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}","").toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[^a-z0-9]+"," ").trim();
    }
}