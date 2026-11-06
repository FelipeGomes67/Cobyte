package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description="Síntese técnica do relato, sem suposições de causa não confirmadas.")
public record ResumoTecnicoIaResponse(
        @Schema(description="Erro ou comportamento observado; não confundir sintoma com causa.") String sintomaObservado,
        @Schema(description="Alcance e impacto operacional sustentados pelo relato; explicitar incertezas.") String impactoOperacional
) {}