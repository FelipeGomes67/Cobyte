package com.labware.api.service;

import com.labware.api.model.entity.Chamado;
import com.labware.api.model.entity.PausaSla;
import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.repository.PausaSlaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SlaChamadoService {
    private final PausaSlaRepository pausas;

    public void registrarPrimeiraResposta(Chamado chamado, LocalDateTime agora) {
        if (chamado.getPrazoPrimeiraResposta() != null) {
            chamado.getPausasSla().stream().filter(p -> p.getFim() == null).findFirst()
                    .ifPresent(p -> chamado.setPrazoPrimeiraResposta(chamado.getPrazoPrimeiraResposta()
                            .plus(Duration.between(p.getInicio(), agora))));
        }
        chamado.setPrimeiraRespostaEm(agora);
    }

    // O chamado deve estar bloqueado para escrita na transacao do solicitante.
    public void aoAlterarStatus(Chamado chamado, Usuario usuario, StatusChamado novo) {
        var agora = LocalDateTime.now();
        if (novo == StatusChamado.AGUARDANDO_CLIENTE) {
            boolean aberta = chamado.getPausasSla().stream().anyMatch(p -> p.getFim() == null);
            if (!aberta) {
                var pausa = pausas.save(PausaSla.builder().chamado(chamado).usuario(usuario)
                        .motivo("Aguardando resposta do solicitante").inicio(agora).build());
                chamado.getPausasSla().add(pausa);
            }
        } else if (chamado.getStatus() == StatusChamado.AGUARDANDO_CLIENTE) {
            for (var pausa : chamado.getPausasSla()) {
                if (pausa.getFim() != null) continue;
                pausa.setFim(agora);
                var duracao = Duration.between(pausa.getInicio(), agora);
                if (chamado.getPrazoResolucao() != null)
                    chamado.setPrazoResolucao(chamado.getPrazoResolucao().plus(duracao));
                if (chamado.getPrimeiraRespostaEm() == null && chamado.getPrazoPrimeiraResposta() != null)
                    chamado.setPrazoPrimeiraResposta(chamado.getPrazoPrimeiraResposta().plus(duracao));
            }
        }
    }
}
