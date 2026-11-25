package com.cobyte.api.dto.request;

import com.cobyte.api.model.enums.PerfilUsuario;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AtualizarUsuarioAdminRequest(@NotNull PerfilUsuario perfil, @Positive Long empresaId) {}
