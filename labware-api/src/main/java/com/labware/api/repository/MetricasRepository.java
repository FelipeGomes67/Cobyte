package com.labware.api.repository;

import com.labware.api.dto.response.KpisGeraisResponse;
import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;
import com.labware.api.model.enums.StatusChamado;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class MetricasRepository {

    private final JdbcTemplate jdbc;

    public KpisGeraisResponse calcularKpisGerais(LocalDate dataInicio, LocalDate dataFim, Long empresaId, LocalDateTime agora) {
        StringBuilder sql = new StringBuilder("""
            SELECT
                count(*) AS total_chamados,
                count(*) FILTER (WHERE status = 'ABERTO') AS chamados_abertos,
                count(*) FILTER (WHERE status IN ('EM_ANALISE', 'EM_ATENDIMENTO')) AS chamados_em_andamento,
                count(*) FILTER (WHERE status = 'AGUARDANDO_CLIENTE') AS chamados_aguardando_cliente,
                count(*) FILTER (WHERE status IN ('RESOLVIDO', 'FECHADO')) AS chamados_resolvidos,
                100.0 * count(*) FILTER (WHERE status IN ('RESOLVIDO', 'FECHADO') AND resolvido_em IS NOT NULL AND prazo_resolucao IS NOT NULL AND resolvido_em <= prazo_resolucao)
                    / nullif(count(*) FILTER (WHERE status IN ('RESOLVIDO', 'FECHADO') AND resolvido_em IS NOT NULL AND prazo_resolucao IS NOT NULL), 0) AS taxa_sla,
                avg(extract(epoch FROM primeira_resposta_em - aberto_em) / 60.0)
                    FILTER (WHERE primeira_resposta_em IS NOT NULL AND primeira_resposta_em >= aberto_em) AS tempo_medio_resposta_min,
                avg(extract(epoch FROM resolvido_em - aberto_em) / 3600.0)
                    FILTER (WHERE resolvido_em IS NOT NULL AND resolvido_em >= aberto_em) AS tempo_medio_resolucao_horas,
                count(*) FILTER (
                    WHERE status NOT IN ('RESOLVIDO', 'FECHADO')
                      AND (
                        (resolvido_em IS NULL AND prazo_resolucao IS NOT NULL AND prazo_resolucao >= ? AND prazo_resolucao <= ?)
                        OR
                        (primeira_resposta_em IS NULL AND prazo_primeira_resposta IS NOT NULL AND prazo_primeira_resposta >= ? AND prazo_primeira_resposta <= ?)
                      )
                ) AS chamados_sla_em_risco
            FROM chamado
            WHERE 1=1
        """);

        LocalDateTime umaHoraDepois = agora.plusHours(1);
        List<Object> params = new ArrayList<>();
        params.add(agora);
        params.add(umaHoraDepois);
        params.add(agora);
        params.add(umaHoraDepois);

        aplicarFiltros(sql, params, dataInicio, dataFim, empresaId);

        return jdbc.queryForObject(sql.toString(), (rs, rowNum) -> {
            long total = rs.getLong("total_chamados");
            long abertos = rs.getLong("chamados_abertos");
            long emAndamento = rs.getLong("chamados_em_andamento");
            long aguardando = rs.getLong("chamados_aguardando_cliente");
            long resolvidos = rs.getLong("chamados_resolvidos");

            BigDecimal taxa = rs.getBigDecimal("taxa_sla");
            Double taxaSla = taxa != null ? Math.round(taxa.doubleValue() * 10.0) / 10.0 : (total == 0 ? 100.0 : 100.0);

            BigDecimal respMin = rs.getBigDecimal("tempo_medio_resposta_min");
            Long tempoMedioResp = respMin != null ? Math.round(respMin.doubleValue()) : 0L;

            BigDecimal resHoras = rs.getBigDecimal("tempo_medio_resolucao_horas");
            Double tempoMedioRes = resHoras != null ? Math.round(resHoras.doubleValue() * 10.0) / 10.0 : 0.0;

            long slaRisco = rs.getLong("chamados_sla_em_risco");

            return new KpisGeraisResponse(
                    total, abertos, emAndamento, aguardando, resolvidos,
                    taxaSla, tempoMedioResp, tempoMedioRes, slaRisco
            );
        }, params.toArray());
    }

    public Map<String, Long> contarPorStatus(LocalDate dataInicio, LocalDate dataFim, Long empresaId) {
        StringBuilder sql = new StringBuilder("""
            SELECT status, count(*) AS qtd
            FROM chamado
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();
        aplicarFiltros(sql, params, dataInicio, dataFim, empresaId);
        sql.append(" GROUP BY status");

        Map<String, Long> resultado = new LinkedHashMap<>();
        for (StatusChamado s : StatusChamado.values()) {
            resultado.put(s.name(), 0L);
        }

        jdbc.query(sql.toString(), rs -> {
            String status = rs.getString("status");
            if (status != null && resultado.containsKey(status)) {
                resultado.put(status, rs.getLong("qtd"));
            }
        }, params.toArray());

        return resultado;
    }

    public Map<String, Long> contarPorPrioridade(LocalDate dataInicio, LocalDate dataFim, Long empresaId) {
        StringBuilder sql = new StringBuilder("""
            SELECT coalesce(prioridade, 'SEM_CLASSIFICACAO') AS prioridade, count(*) AS qtd
            FROM chamado
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();
        aplicarFiltros(sql, params, dataInicio, dataFim, empresaId);
        sql.append(" GROUP BY prioridade");

        Map<String, Long> resultado = new LinkedHashMap<>();
        for (Prioridade p : Prioridade.values()) {
            resultado.put(p.name(), 0L);
        }

        jdbc.query(sql.toString(), rs -> {
            String prioridade = rs.getString("prioridade");
            if (prioridade != null) {
                resultado.put(prioridade, rs.getLong("qtd"));
            }
        }, params.toArray());

        return resultado;
    }

    public Map<String, Long> contarPorModulo(LocalDate dataInicio, LocalDate dataFim, Long empresaId) {
        StringBuilder sql = new StringBuilder("""
            SELECT coalesce(categoria, 'OUTROS') AS categoria, count(*) AS qtd
            FROM chamado
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();
        aplicarFiltros(sql, params, dataInicio, dataFim, empresaId);
        sql.append(" GROUP BY categoria");

        Map<String, Long> resultado = new LinkedHashMap<>();
        for (CategoriaChamado c : CategoriaChamado.values()) {
            resultado.put(c.name(), 0L);
        }

        jdbc.query(sql.toString(), rs -> {
            String cat = rs.getString("categoria");
            if (cat != null) {
                resultado.put(cat, rs.getLong("qtd"));
            }
        }, params.toArray());

        return resultado;
    }

    public Map<LocalDate, Long> contarAbertosPorDia(LocalDate inicio, LocalDate fim, Long empresaId) {
        StringBuilder sql = new StringBuilder("""
            SELECT CAST(aberto_em AS DATE) AS dia, count(*) AS qtd
            FROM chamado
            WHERE aberto_em >= ? AND aberto_em <= ?
        """);
        List<Object> params = new ArrayList<>();
        params.add(inicio.atStartOfDay());
        params.add(fim.atTime(LocalTime.MAX));

        if (empresaId != null) {
            sql.append(" AND empresa_id = ?");
            params.add(empresaId);
        }
        sql.append(" GROUP BY CAST(aberto_em AS DATE)");

        Map<LocalDate, Long> map = new HashMap<>();
        jdbc.query(sql.toString(), rs -> {
            java.sql.Date d = rs.getDate("dia");
            if (d != null) {
                map.put(d.toLocalDate(), rs.getLong("qtd"));
            }
        }, params.toArray());

        return map;
    }

    public Map<LocalDate, Long> contarResolvidosPorDia(LocalDate inicio, LocalDate fim, Long empresaId) {
        StringBuilder sql = new StringBuilder("""
            SELECT CAST(resolvido_em AS DATE) AS dia, count(*) AS qtd
            FROM chamado
            WHERE resolvido_em >= ? AND resolvido_em <= ?
        """);
        List<Object> params = new ArrayList<>();
        params.add(inicio.atStartOfDay());
        params.add(fim.atTime(LocalTime.MAX));

        if (empresaId != null) {
            sql.append(" AND empresa_id = ?");
            params.add(empresaId);
        }
        sql.append(" GROUP BY CAST(resolvido_em AS DATE)");

        Map<LocalDate, Long> map = new HashMap<>();
        jdbc.query(sql.toString(), rs -> {
            java.sql.Date d = rs.getDate("dia");
            if (d != null) {
                map.put(d.toLocalDate(), rs.getLong("qtd"));
            }
        }, params.toArray());

        return map;
    }

    public List<Long> buscarIdsChamadosUrgentes(Long empresaId, int limite) {
        StringBuilder sql = new StringBuilder("""
            SELECT id
            FROM chamado
            WHERE status NOT IN ('RESOLVIDO', 'FECHADO')
        """);
        List<Object> params = new ArrayList<>();
        if (empresaId != null) {
            sql.append(" AND empresa_id = ?");
            params.add(empresaId);
        }
        sql.append("""
            ORDER BY
                CASE prioridade
                    WHEN 'CRITICA' THEN 0
                    WHEN 'ALTA' THEN 1
                    WHEN 'MEDIA' THEN 2
                    WHEN 'BAIXA' THEN 3
                    ELSE 4
                END,
                prazo_resolucao ASC NULLS LAST,
                aberto_em ASC
            LIMIT ?
        """);
        params.add(limite);

        return jdbc.queryForList(sql.toString(), Long.class, params.toArray());
    }

    private void aplicarFiltros(StringBuilder sql, List<Object> params, LocalDate dataInicio, LocalDate dataFim, Long empresaId) {
        if (empresaId != null) {
            sql.append(" AND empresa_id = ?");
            params.add(empresaId);
        }
        if (dataInicio != null) {
            sql.append(" AND aberto_em >= ?");
            params.add(dataInicio.atStartOfDay());
        }
        if (dataFim != null) {
            sql.append(" AND aberto_em <= ?");
            params.add(dataFim.atTime(LocalTime.MAX));
        }
    }
}
