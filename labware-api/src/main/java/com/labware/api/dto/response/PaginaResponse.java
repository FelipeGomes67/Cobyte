package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;
/** Contrato estável independente da serialização interna do PageImpl. */
@Schema(description = "Página estável: itens em content, página iniciando em zero, total e tamanho.")
public record PaginaResponse<T>(
        @Schema(description = "Itens da página atual.")
        List<T> content,
        @Schema(description = "Quantidade total de itens que correspondem ao filtro.", example = "32")
        long totalElements,
        @Schema(description = "Número total de páginas.", example = "2")
        int totalPages,
        @Schema(description = "Número da página, iniciando em zero.", example = "0")
        int number,
        @Schema(description = "Tamanho solicitado, entre 1 e 100.", example = "20")
        int size
) {
    public static <T> PaginaResponse<T> from(Page<T> page) {
        return new PaginaResponse<>(page.getContent(),page.getTotalElements(),page.getTotalPages(),page.getNumber(),page.getSize());
    }
}
