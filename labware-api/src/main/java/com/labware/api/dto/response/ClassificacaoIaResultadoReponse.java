package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;

@Schema(description = "Resultado interno estruturado do classificador IA.")
public record ClassificacaoIaResultadoReponse(
        @Schema(description = "Prioridade.")
        @JsonProperty("prioridadeGeradaIa")
        @JsonAlias({"prioridade", "prioridade_gerada_ia", "priority"})
        Prioridade prioridade,

        @Schema(description = "Categoria.")
        @JsonProperty("categoriaGeradaIa")
        @JsonAlias({"categoria", "categoria_gerada_ia", "category"})
        CategoriaChamado categoria,

        @Schema(description = "Justificativa.")
        @JsonProperty("justificativaIa")
        @JsonAlias({"justificativa", "justificativa_ia", "justification", "motivo"})
        String justificativa,

        @Schema(description = "Título sugerido pelo modelo; pode ser null em registros antigos.", example = "Falha de acesso")
        @JsonProperty("tituloGeradoIa")
        @JsonAlias({"titulo", "titulo_gerado_ia", "tituloSugerido", "title"})
        String tituloGeradoIa,

        @Schema(description = "Reservado à sugestão de técnico; atualmente null, sem regra de competências/disponibilidade.", nullable = true)
        @JsonProperty("tecnicoSugeridoId")
        @JsonAlias({"tecnicoSugerido", "tecnicoId", "tecnico_sugerido_id"})
        Long tecnicoSugeridoId,

        @JsonProperty("resumoTecnicoIa")
        @JsonAlias({"resumoTecnico", "resumo_tecnico_ia", "resumoIa", "resumo"})
        ResumoTecnicoIaResponse resumoTecnicoIa
) {
    public ClassificacaoIaResultadoReponse(Prioridade prioridade, CategoriaChamado categoria, String justificativa,
            String tituloGeradoIa, Long tecnicoSugeridoId) {
        this(prioridade, categoria, justificativa, tituloGeradoIa, tecnicoSugeridoId, null);
    }
    public ClassificacaoIaResultadoReponse(Prioridade prioridade, CategoriaChamado categoria, String justificativa) {
        this(prioridade, categoria, justificativa, null, null, null);
    }
}
