package com.labware.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AprovarUsuarioRequest(@NotNull @Positive Long empresaId) {}
