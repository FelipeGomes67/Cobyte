package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;

@Schema(description = "Resultado interno estruturado do classificador IA.")
public record ClassificacaoIaResultadoReponse(
        @Schema(description = "Prioridade.")
        @com.fasterxml.jackson.annotation.JsonProperty("prioridadeGeradaIa")
        @com.fasterxml.jackson.annotation.JsonAlias("prioridade") Prioridade prioridade,
        @Schema(description = "Categoria.")
        @com.fasterxml.jackson.annotation.JsonProperty("categoriaGeradaIa")
        @com.fasterxml.jackson.annotation.JsonAlias("categoria") CategoriaChamado categoria,
        @Schema(description = "Justificativa.")
        @com.fasterxml.jackson.annotation.JsonProperty("justificativaIa")
        @com.fasterxml.jackson.annotation.JsonAlias("justificativa") String justificativa,
        @Schema(description = "Título sugerido pelo modelo; pode ser null em registros antigos.", example = "Falha de acesso")
        String tituloGeradoIa,
        @Schema(description = "Reservado à sugestão de técnico; atualmente null, sem regra de competências/disponibilidade.", nullable = true)
        Long tecnicoSugeridoId,
        ResumoTecnicoIaResponse resumoTecnicoIa
) {
    public ClassificacaoIaResultadoReponse(Prioridade prioridade, CategoriaChamado categoria, String justificativa,
            String tituloGeradoIa, Long tecnicoSugeridoId) {
        this(prioridade,categoria,justificativa,tituloGeradoIa,tecnicoSugeridoId,null);
    }
    public ClassificacaoIaResultadoReponse(Prioridade prioridade, CategoriaChamado categoria,String justificativa) {
        this(prioridade,categoria,justificativa,null,null,null);
    }
}
