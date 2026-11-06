package com.labware.api.service;

import com.labware.api.dto.request.AtualizarPerfilRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TelefonePerfilValidationTest {
    @Test void telefoneRespeitaLimiteDoBanco() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(requestTelefone("1".repeat(20))).isEmpty());
            assertTrue(validator.validate(requestTelefone("1".repeat(21))).stream()
                    .anyMatch(v -> v.getPropertyPath().toString().equals("telefone")));
        }
    }

    private AtualizarPerfilRequest requestTelefone(String telefone) {
        return new AtualizarPerfilRequest("Cliente", "cliente@teste.com", null, null, telefone, null);
    }

}
