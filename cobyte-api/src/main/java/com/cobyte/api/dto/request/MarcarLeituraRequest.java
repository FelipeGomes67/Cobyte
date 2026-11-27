package com.cobyte.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record MarcarLeituraRequest(@NotNull @PositiveOrZero Long ultimaMensagemId) { }
