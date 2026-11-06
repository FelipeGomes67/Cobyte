package com.labware.api.repository;
import com.labware.api.dto.response.*;
import com.labware.api.model.enums.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.*;
import java.util.*;
@Repository @RequiredArgsConstructor
public class RelatorioRepository {
    private final JdbcTemplate jdbc;
    public KpisResponse kpis() {
        return jdbc.queryForObject("""
            SELECT (SELECT avg(nota_avaliacao) FROM avaliacao a JOIN chamado c ON c.avaliacao_id=a.id) nota,
              avg(extract(epoch FROM primeira_resposta_em-aberto_em)/60.0) resposta,
              100.0 * count(*) FILTER(WHERE resolvido_em<=prazo_resolucao) /
                nullif(count(*) FILTER(WHERE resolvido_em IS NOT NULL AND prazo_resolucao IS NOT NULL),0) sla,
              (SELECT count(*) FROM avaliacao a JOIN chamado c ON c.avaliacao_id=a.id) avaliacoes,
              count(primeira_resposta_em) respostas,
              count(*) FILTER(WHERE resolvido_em IS NOT NULL AND prazo_resolucao IS NOT NULL) resolvidos
            FROM chamado
            """,(rs,n)->new KpisResponse(numero(rs,"nota"),numero(rs,"resposta"),
                numero(rs,"sla"),rs.getLong("avaliacoes"),rs.getLong("respostas"),rs.getLong("resolvidos")));
    }
    private Double numero(java.sql.ResultSet rs,String coluna) throws java.sql.SQLException {
        java.math.BigDecimal valor=rs.getBigDecimal(coluna);
        return valor==null?null:valor.doubleValue();
    }
    public List<GrupoContagemResponse> porCategoria() {
        return agrupar("SELECT coalesce(categoria,'SEM_CLASSIFICACAO') grupo,count(*) quantidade FROM chamado GROUP BY categoria",
                Arrays.stream(CategoriaChamado.values()).map(Enum::name).toList());
    }
    public List<GrupoContagemResponse> porPrioridade() {
        return agrupar("SELECT coalesce(prioridade,'SEM_CLASSIFICACAO') grupo,count(*) quantidade FROM chamado GROUP BY prioridade",
                Arrays.stream(Prioridade.values()).map(Enum::name).toList());
    }
    private List<GrupoContagemResponse> agrupar(String sql,List<String> nomes) {
        Map<String,Long> m=new LinkedHashMap<>(); nomes.forEach(n->m.put(n,0L)); m.put("SEM_CLASSIFICACAO",0L);
        jdbc.query(sql,(org.springframework.jdbc.core.RowCallbackHandler)rs->m.put(rs.getString("grupo"),rs.getLong("quantidade")));
        return m.entrySet().stream().map(e->new GrupoContagemResponse(e.getKey(),e.getValue())).toList();
    }
    public List<EvolucaoMensalResponse> evolucao(int ano) {
        var inicio=LocalDate.of(ano,1,1).atStartOfDay(); var fim=inicio.plusYears(1);
        return jdbc.query("""
            SELECT mes,
              (SELECT count(*) FROM chamado WHERE aberto_em>=? AND aberto_em<? AND extract(month FROM aberto_em)=mes) abertos,
              (SELECT count(*) FROM chamado WHERE resolvido_em>=? AND resolvido_em<? AND extract(month FROM resolvido_em)=mes) resolvidos
            FROM generate_series(1,12) mes ORDER BY mes
            """,(rs,n)->new EvolucaoMensalResponse(rs.getInt("mes"),rs.getLong("abertos"),rs.getLong("resolvidos")),inicio,fim,inicio,fim);
    }
    public long atividadesRecentes(LocalDateTime inicio) {
        return jdbc.queryForObject("SELECT count(*) FROM historico WHERE alterado_em>=?",Long.class,inicio);
    }
    public List<Long> prioritarios(Long usuarioId) {
        return jdbc.queryForList("""
            SELECT id FROM chamado WHERE responsavel_id=? AND status NOT IN ('RESOLVIDO','FECHADO')
            ORDER BY CASE prioridade WHEN 'CRITICA' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 WHEN 'BAIXA' THEN 3 ELSE 4 END,
              prazo_resolucao NULLS LAST,aberto_em,id LIMIT 10
            """,Long.class,usuarioId);
    }
}
