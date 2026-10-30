package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import com.labware.api.model.entity.ClassificacaoIa;
import com.labware.api.model.enums.*;
@Schema(description = "Sugestões da IA, distintas da decisão final humana. Técnico sugerido atualmente não é calculado.")
public record TriagemResponse(
        @Schema(description = "Título sugerido pelo modelo; pode ser null em registros antigos.", example = "Falha de acesso")
        String tituloGeradoIa,
        @Schema(description = "Categoria sugerida pelo modelo.", example = "ACESSO")
        CategoriaChamado categoriaGeradaIa,
        @Schema(description = "Prioridade sugerida pelo modelo.", example = "ALTA")
        Prioridade prioridadeGeradaIa,
        @Schema(description = "Reservado à sugestão de técnico; atualmente null, sem regra de competências/disponibilidade.", nullable = true)
        Long tecnicoSugeridoId,
        @Schema(description = "Justificativa da sugestão do modelo.", example = "Usuário sem acesso à funcionalidade principal.")
        String justificativaIa,
        @Schema(description = "Meta de resolução calculada pelo backend conforme a prioridade sugerida.", example = "240")
        Integer slaMetaMinutos,
        @Schema(description = "Indica existência de classificação IA.", example = "true")
        boolean triadoPorIa,
        ResumoTecnicoIaResponse resumoTecnicoIa
) {
    @com.fasterxml.jackson.annotation.JsonProperty("enriquecimentoCompleto")
    public boolean enriquecimentoCompleto() { return resumoTecnicoIa!=null && tituloGeradoIa!=null && !tituloGeradoIa.isBlank(); }
    public static TriagemResponse from(ClassificacaoIa c) {
        return new TriagemResponse(c.getTituloGeradoIa(),c.getCategoriaSugerida(),c.getPrioridadeSugerida(),
                c.getTecnicoSugerido()==null?null:c.getTecnicoSugerido().getId(),c.getJustificativa(),c.getSlaMetaMinutos(),true,
                c.getSintomaObservadoIa()==null && c.getImpactoOperacionalIa()==null ? null :
                        new ResumoTecnicoIaResponse(c.getSintomaObservadoIa(),c.getImpactoOperacionalIa()));
    }
}
