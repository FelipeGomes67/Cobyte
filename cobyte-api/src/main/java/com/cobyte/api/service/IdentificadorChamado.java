package com.cobyte.api.service;

import com.cobyte.api.exception.ResourceNotFoundException;
import com.cobyte.api.repository.ChamadoRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IdentificadorChamado {
    private final ChamadoRepository chamados;

    public Long interno(UUID publico) {
        return chamados.buscarIdInterno(publico)
                .orElseThrow(() -> new ResourceNotFoundException("Chamado não encontrado"));
    }
}
