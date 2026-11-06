package com.labware.api.service;

import com.labware.api.dto.response.DashboardResponse;
import com.labware.api.dto.response.MetricasResumoResponse;
import com.labware.api.dto.response.PrioridadeContagemResponse;
import com.labware.api.model.enums.Prioridade;
import com.labware.api.repository.ChamadoRepository;
import com.labware.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.EnumMap;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MetricasChamadoService {
    private final ChamadoRepository chamadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AcessoChamadoService acesso;

    public MetricasResumoResponse resumo(Long usuarioId) {
        return resumir(escopo(usuarioId));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public DashboardResponse dashboard(Long usuarioId) {
        Long solicitanteId = escopo(usuarioId);
        var resumo = resumir(solicitanteId);
        var contagens = new EnumMap<Prioridade, Long>(Prioridade.class);
        long semClassificacao = 0;
        for (var item : chamadoRepository.contarPorPrioridade(solicitanteId)) {
            if (item.getPrioridade() == null) {
                semClassificacao = item.getQuantidade();
            } else {
                contagens.put(item.getPrioridade(), item.getQuantidade());
            }
        }
        var porPrioridade = Arrays.stream(Prioridade.values())
                .map(p -> new PrioridadeContagemResponse(p, contagens.getOrDefault(p, 0L)))
                .toList();
        return new DashboardResponse(resumo, porPrioridade, semClassificacao);
    }

    private Long escopo(Long usuarioId) {
        var usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
        return acesso.ehSuporte(usuario) ? null : usuario.getId();
    }

    private MetricasResumoResponse resumir(Long solicitanteId) {
        var m = chamadoRepository.resumir(solicitanteId, LocalDateTime.now());
        return new MetricasResumoResponse(m.getTotal(), m.getAbertos(), m.getEmAnalise(),
                m.getEmAtendimento(), m.getAguardandoCliente(), m.getResolvidos(), m.getFechados(),
                m.getResolvidosForaDoPrazo(), m.getIncidentesCriticos(), m.getSlasEmRisco());
    }
}
