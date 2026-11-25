package com.cobyte.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlterarCategoriaRequest(@NotBlank String novaCategoria,
        @Size(max = 100) String categoriaPersonalizada) {}
