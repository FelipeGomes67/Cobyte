package com.labware.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CadastrarEmpresaRequest(
        @NotBlank @Size(max=255) String nome,
        @NotBlank @Size(max=18) String cnpj
) {}
