package com.labware.api.service;

import com.labware.api.dto.response.*;
import com.labware.api.model.entity.Chamado;
import com.labware.api.repository.ChamadoRepository;
import com.labware.api.repository.ClassificacaoIaRepository;
import com.labware.api.repository.MetricasRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class MetricasService {

    private final MetricasRepository metricasRepository;
    private final ChamadoRepository chamadoRepository;
    private final ClassificacaoIaRepository classificacaoIaRepository;

    public MetricasDashboardResponse obterDashboard(LocalDate dataInicio, LocalDate dataFim, Long empresaId) {
        LocalDateTime agora = LocalDateTime.now();

        // Tratamento e ajuste de intervalo de datas
        LocalDate hoje = LocalDate.now();
        LocalDate fimTrend = (dataFim != null) ? dataFim : hoje;
        LocalDate inicioTrend = (dataInicio != null) ? dataInicio : fimTrend.minusDays(29);

        if (inicioTrend.isAfter(fimTrend)) {
            LocalDate temp = inicioTrend;
            inicioTrend = fimTrend;
            fimTrend = temp;
        }

        // 1. KPIs Gerais consolidados via SQL com agregações nativas
        KpisGeraisResponse kpisGerais = metricasRepository.calcularKpisGerais(dataInicio, dataFim, empresaId, agora);

        // 2. Distribuição por status (garante todos os status do enum)
        Map<String, Long> distribuicaoPorStatus = metricasRepository.contarPorStatus(dataInicio, dataFim, empresaId);

        // 3. Distribuição por prioridade (garante todas as prioridades)
        Map<String, Long> distribuicaoPorPrioridade = metricasRepository.contarPorPrioridade(dataInicio, dataFim, empresaId);

        // 4. Chamados agrupados por categoria/módulo
        Map<String, Long> chamadosPorModulo = metricasRepository.contarPorModulo(dataInicio, dataFim, empresaId);

        // 5. Série temporal diária (tendência últimos dias sem dias faltando)
        List<TendenciaChamadoResponse> tendenciaChamados = gerarTendencia(inicioTrend, fimTrend, empresaId);

        // 6. Chamados mais urgentes / em risco para a tabela de visão rápida
        List<ChamadoResponse> chamadosUrgentes = buscarChamadosUrgentes(empresaId, 10);

        return new MetricasDashboardResponse(
                kpisGerais,
                distribuicaoPorStatus,
                distribuicaoPorPrioridade,
                chamadosPorModulo,
                tendenciaChamados,
                chamadosUrgentes
        );
    }

    private List<TendenciaChamadoResponse> gerarTendencia(LocalDate inicio, LocalDate fim, Long empresaId) {
        // Limita a 90 dias para não gerar payload excessivo caso período seja muito longo
        LocalDate dataInicialReal = inicio;
        if (ChronoUnit.DAYS.between(inicio, fim) > 90) {
            dataInicialReal = fim.minusDays(89);
        }

        Map<LocalDate, Long> abertosPorDia = metricasRepository.contarAbertosPorDia(dataInicialReal, fim, empresaId);
        Map<LocalDate, Long> resolvidosPorDia = metricasRepository.contarResolvidosPorDia(dataInicialReal, fim, empresaId);

        List<TendenciaChamadoResponse> pontos = new ArrayList<>();
        LocalDate atual = dataInicialReal;
        while (!atual.isAfter(fim)) {
            pontos.add(new TendenciaChamadoResponse(
                    atual.toString(),
                    abertosPorDia.getOrDefault(atual, 0L),
                    resolvidosPorDia.getOrDefault(atual, 0L)
            ));
            atual = atual.plusDays(1);
        }

        return pontos;
    }

    private List<ChamadoResponse> buscarChamadosUrgentes(Long empresaId, int limite) {
        List<Long> ids = metricasRepository.buscarIdsChamadosUrgentes(empresaId, limite);
        if (ids.isEmpty()) {
            return Collections.emptyList();
        }

        List<ChamadoResponse> lista = new ArrayList<>();
        for (Long id : ids) {
            chamadoRepository.findById(id).ifPresent(c -> {
                boolean comIa = classificacaoIaRepository.findByChamadoId(c.getId()).isPresent();
                lista.add(ChamadoResponse.from(c, comIa));
            });
        }
        return lista;
    }
}
