package com.labware.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "labware.email.fila-habilitada", havingValue = "true", matchIfMissing = true)
public class FilaEmailScheduler {
    private final EnvioEmailService envios;

    @Scheduled(fixedDelayString = "${labware.email.intervalo-ms:10000}")
    public void processar() {
        // Cada chamada abre uma transação própria e bloqueia apenas um email.
        for (int i = 0; i < 20 && envios.enviarProximo(); i++) { }
    }
}
