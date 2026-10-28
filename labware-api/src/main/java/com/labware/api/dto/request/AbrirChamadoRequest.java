package com.labware.api.dto.request;

import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AbrirChamadoRequest {

    @NotBlank(message = "O Título é obrigatório")
    @Size(max = 255)
    private String titulo;

    @NotBlank(message = "A Descrição é obrigatória")
    private String descricao;

    @NotNull(message = "A prioridade é obrigatória")
    private Prioridade prioridade;

    @NotNull(message = "A categoria é obrigatória")
    private CategoriaChamado categoria;


}
