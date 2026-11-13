package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import com.labware.api.model.entity.Chamado;
import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;
import com.labware.api.model.enums.SlaStatus;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.model.enums.OrigemChamado;

import java.time.LocalDateTime;

@Schema(description = "Detalhes do chamado com avaliação, SLA e indicador de leitura individual.")
public record ChamadoResponse(
        @Schema(description = "Identificador do recurso.", example = "108")
        Long id,
        @Schema(description = "Código público único do chamado.", example = "LAB-2026-00108")
        String protocolo,
        @Schema(description = "Título do chamado.", example = "Falha no acesso ao sistema")
        String titulo,
        @Schema(description = "Relato detalhado, digitado ou obtido por STT.", example = "Não consigo acessar o módulo de resultados.")
        String descricao,
        @Schema(description = "Status.")
        StatusChamado status,
        @Schema(description = "Prioridade.")
        Prioridade prioridade,
        @Schema(description = "Categoria.")
        CategoriaChamado categoria,
        @Schema(description = "Origem persistida TEXTO/VOZ; o request também aceita PORTAL_TEXTO/AUDIO_VOZ.", example = "TEXTO")
        OrigemChamado origem,
        @Schema(description = "Nota inteira de 1 a 5. Request aceita também avaliacaoNota.", example = "5")
        Integer notaAvaliacao,
        @Schema(description = "Comentário opcional, até 500 caracteres. Request aceita também avaliacaoComentario.", example = "Atendimento rápido.")
        String comentarioAvaliacao,
        @Schema(description = "Avaliado em.")
        LocalDateTime avaliadoEm,
        @Schema(description = "Nome da empresa cadastrada vinculada ao chamado.", example = "Laboratório Exemplo")
        String empresa,
        @Schema(description = "Solicitante.")
        String solicitante,
        @Schema(description = "Responsavel.")
        String responsavel,
        @Schema(description = "Aberto em.")
        LocalDateTime abertoEm,
        @Schema(description = "Prazo primeira resposta.")
        LocalDateTime prazoPrimeiraResposta,
        @Schema(description = "Primeira resposta em.")
        LocalDateTime primeiraRespostaEm,
        @Schema(description = "Situação do SLA de primeira resposta.", example = "NO_PRAZO")
        SlaStatus slaPrimeiraResposta,
        @Schema(description = "Prazo resolucao.")
        LocalDateTime prazoResolucao,
        @Schema(description = "Resolvido em.")
        LocalDateTime resolvidoEm,
        @Schema(description = "Situação do SLA de resolução.", example = "NO_PRAZO")
        SlaStatus slaResolucao,
        @Schema(description = "true se algum dos SLAs estiver violado.", example = "false")
        boolean slaViolado,
        @Schema(description = "Existe registro de classificação IA para o chamado.", example = "true")
        boolean classificadoPorIa,
        @Schema(description = "Duração do áudio em segundos; null quando não disponível.", example = "12.5")
        Double duracaoAudioSegundos,
        @Schema(description = "ID do responsável; null se não atribuído.", example = "2")
        Long responsavelId,
        @Schema(description = "ID do solicitante (cliente que abriu o chamado).", example = "1")
        Long solicitanteId,
        @Schema(description = "E-mail do solicitante.", example = "cliente@labware.com")
        String solicitanteEmail,
        @Schema(description = "Justificativa da IA para a prioridade e categoria.")
        String justificativaIa,
        @Schema(description = "Título técnico gerado pela IA.")
        String tituloGeradoIa,
        @Schema(description = "Sintoma observado gerado pela IA.")
        String sintomaObservadoIa,
        @Schema(description = "Impacto operacional gerado pela IA.")
        String impactoOperacionalIa,
        @Schema(description = "Nome de origem para o frontend: PORTAL_TEXTO ou AUDIO_VOZ.", example = "PORTAL_TEXTO")
        String origemFrontend,
        @Schema(description = "Tempo até o prazo de resolução ou descrição da conclusão/violação.", example = "1h 20min restantes")
        String slaTempoRestanteFormatado,
        @Schema(description = "Situação do SLA de resolução.", example = "NO_PRAZO")
        SlaStatus slaStatus,
        @Schema(description = "Há mensagem visível de outro autor após o marcador de leitura deste usuário.", example = "true")
        boolean temNovaMensagem,
        String motivoCancelamento,
        LocalDateTime canceladoEm,
        Long canceladoPorId,
        String canceladoPorNome,
        long slaPausaTotalSegundos,
        java.util.List<TecnicoResponse> tecnicos
) {

    public record TecnicoResponse(Long id, String nome) { }

    private static java.util.List<TecnicoResponse> tecnicosDoChamado(Chamado chamado) {
        var equipe = new java.util.LinkedHashMap<Long, TecnicoResponse>();
        if (chamado.getResponsavel() != null) {
            var u = chamado.getResponsavel();
            equipe.put(u.getId(), new TecnicoResponse(u.getId(), u.getNome()));
        }
        chamado.getTecnicos().stream().sorted(java.util.Comparator.comparing(com.labware.api.model.entity.Usuario::getId))
                .forEach(u -> equipe.put(u.getId(), new TecnicoResponse(u.getId(), u.getNome())));
        return java.util.List.copyOf(equipe.values());
    }

    public static ChamadoResponse from(Chamado c, boolean classificadoPorIa) {
        return from(c, classificadoPorIa, false);
    }

    public static ChamadoResponse from(Chamado c, boolean classificadoPorIa, boolean temNovaMensagem) {
        return from(c, null, classificadoPorIa, temNovaMensagem);
    }

    public static ChamadoResponse from(Chamado c, com.labware.api.model.entity.ClassificacaoIa ia, boolean temNovaMensagem) {
        return from(c, ia, ia != null, temNovaMensagem);
    }

    public static ChamadoResponse from(Chamado c, com.labware.api.model.entity.ClassificacaoIa ia, boolean classificadoPorIa, boolean temNovaMensagem) {
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime referencia = referenciaSla(c, agora);
        long pausaSegundos = c.getPausasSla().stream().filter(p -> p.getFim() != null)
                .mapToLong(p -> java.time.Duration.between(p.getInicio(), p.getFim()).getSeconds()).sum();
        LocalDateTime inicioAtivo = c.getAbertoEm() == null ? null : c.getAbertoEm().plusSeconds(pausaSegundos);

        boolean melhoria = c.getPrioridade() == Prioridade.MELHORIA || c.getStatus() == StatusChamado.CANCELADO;
        SlaStatus primeira = melhoria ? SlaStatus.NAO_APLICAVEL : SlaStatus.calcular(
                c.getAbertoEm(), c.getPrazoPrimeiraResposta(), c.getPrimeiraRespostaEm(), referencia);
        SlaStatus resolucao = melhoria ? SlaStatus.NAO_APLICAVEL : SlaStatus.calcular(
                inicioAtivo, c.getPrazoResolucao(), c.getResolvidoEm(), referencia);

        return new ChamadoResponse(
                c.getId(),
                c.getProtocolo(),
                c.getTitulo(),
                c.getDescricao(),
                c.getStatus(),
                c.getPrioridade(),
                c.getCategoria(),
                c.getOrigem(),
                c.getAvaliacao() != null ? c.getAvaliacao().getNotaAvaliacao() : null,
                c.getAvaliacao() != null ? c.getAvaliacao().getComentarioAvaliacao() : null,
                c.getAvaliacao() != null ? c.getAvaliacao().getAvaliadoEm() : null,
                c.getEmpresa().getNome(),
                c.getSolicitante().getNome(),
                c.getResponsavel() != null ? c.getResponsavel().getNome() : null,
                c.getAbertoEm(),
                melhoria ? null : c.getPrazoPrimeiraResposta(),
                c.getPrimeiraRespostaEm(),
                primeira,
                melhoria ? null : c.getPrazoResolucao(),
                c.getResolvidoEm(),
                resolucao,
                primeira.violado() || resolucao.violado(),
                classificadoPorIa,
                c.getDuracaoAudioSegundos(),
                c.getResponsavel()!=null ? c.getResponsavel().getId() : null,
                c.getSolicitante()!=null ? c.getSolicitante().getId() : null,
                c.getSolicitante()!=null ? c.getSolicitante().getEmail() : null,
                ia != null ? ia.getJustificativa() : null,
                ia != null ? ia.getTituloGeradoIa() : null,
                ia != null ? ia.getSintomaObservadoIa() : null,
                ia != null ? ia.getImpactoOperacionalIa() : null,
                c.getOrigem()==OrigemChamado.VOZ ? "AUDIO_VOZ" : "PORTAL_TEXTO",
                (c.getStatus() == StatusChamado.AGUARDANDO_CLIENTE ? "Pausado · " : "") + formatar(c,referencia), resolucao, temNovaMensagem,
                c.getMotivoCancelamento(), c.getCanceladoEm(),
                c.getCanceladoPor() == null ? null : c.getCanceladoPor().getId(),
                c.getCanceladoPor() == null ? null : c.getCanceladoPor().getNome(), pausaSegundos, tecnicosDoChamado(c)
        );
    }

    @com.fasterxml.jackson.annotation.JsonProperty("sintomaObservado")
    public String sintomaObservado() { return sintomaObservadoIa; }

    @com.fasterxml.jackson.annotation.JsonProperty("impactoOperacional")
    public String impactoOperacional() { return impactoOperacionalIa; }

    @com.fasterxml.jackson.annotation.JsonProperty("slaMetaMinutos")
    public Long slaMetaMinutos() {
        if (status == StatusChamado.CANCELADO || prioridade == Prioridade.MELHORIA || prazoResolucao == null || abertoEm == null) return null;
        return java.time.Duration.between(abertoEm, prazoResolucao).minusSeconds(slaPausaTotalSegundos).toMinutes();
    }

    @com.fasterxml.jackson.annotation.JsonProperty("slaMetaFormatado")
    public String slaMetaFormatado() {
        Long minutos = slaMetaMinutos();
        if (status == StatusChamado.CANCELADO) return "Sem SLA (Cancelado)";
        if (prioridade == Prioridade.MELHORIA) return "Sem SLA (Melhoria)";
        if (minutos == null) return "Sem prazo";
        return minutos % 60 == 0 ? "SLA de " + minutos / 60 + "h" : "SLA de " + minutos + "min";
    }

    private static LocalDateTime referenciaSla(Chamado c, LocalDateTime agora) {
        if (c.getStatus() != StatusChamado.AGUARDANDO_CLIENTE) return agora;
        return c.getPausasSla().stream().filter(p -> p.getFim() == null)
                .map(com.labware.api.model.entity.PausaSla::getInicio)
                .min(LocalDateTime::compareTo).orElse(agora);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("slaPausado")
    public boolean slaPausado() { return status == StatusChamado.AGUARDANDO_CLIENTE; }

    private static String formatar(Chamado c,LocalDateTime agora) {
        if(c.getStatus()==StatusChamado.CANCELADO) return "Sem SLA (Cancelado)";
        if(c.getPrioridade()==Prioridade.MELHORIA) return "Sem SLA (Melhoria)";
        if(c.getPrazoResolucao()==null) return "Sem prazo";
        if(c.getResolvidoEm()!=null) return c.getResolvidoEm().isAfter(c.getPrazoResolucao()) ? "Concluído fora do prazo" : "Concluído no prazo";
        long segundos=java.time.Duration.between(agora,c.getPrazoResolucao()).getSeconds();
        if(segundos<0) {
            long excedido=-segundos/60;
            return String.format(java.util.Locale.ROOT,"-%02d:%02dh",excedido/60,excedido%60);
        }
        long minutos=(segundos+59)/60;
        return minutos>=60 ? (minutos/60)+"h "+(minutos%60)+"min restantes" : minutos+"min restantes";
    }
}
