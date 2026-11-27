package com.cobyte.api.config;

import com.cobyte.api.model.entity.PoliticaSla;
import com.cobyte.api.model.enums.Prioridade;
import com.cobyte.api.repository.PoliticaSlaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/** Cria somente politicas ausentes, sem redefinir configuracoes ja cadastradas. */
@Component
@RequiredArgsConstructor
public class InicializadorPoliticasSla implements ApplicationRunner {
    private final PoliticaSlaRepository politicas;
    private final TransactionTemplate transacao;

    @Override
    public void run(ApplicationArguments argumentos) {
        for (var prioridade : Prioridade.values()) {
            if (prioridade.minutosResolucao() == null) continue;
            try {
                transacao.executeWithoutResult(status -> {
                    if (politicas.findByPrioridade(prioridade).isEmpty()) {
                        politicas.saveAndFlush(PoliticaSla.builder().prioridade(prioridade)
                                .minutosPrimeiraResposta(120)
                                .minutosResolucao(prioridade.minutosResolucao()).build());
                    }
                });
            } catch (DataIntegrityViolationException conflito) {
                // Outra instancia pode ter criado a mesma prioridade durante a inicializacao.
                if (politicas.findByPrioridade(prioridade).isEmpty()) throw conflito;
            }
        }
    }
}
