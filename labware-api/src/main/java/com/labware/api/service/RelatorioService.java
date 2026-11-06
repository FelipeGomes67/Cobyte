package com.labware.api.service;
import com.labware.api.dto.response.*;
import com.labware.api.repository.RelatorioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
@Service @RequiredArgsConstructor @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class RelatorioService {
    private final RelatorioRepository repo;
    private final MetricasChamadoService metricas;
    private final ChamadoService chamados;
    public KpisResponse kpis() { return repo.kpis(); }
    public List<GrupoContagemResponse> categorias() { return repo.porCategoria(); }
    public List<GrupoContagemResponse> prioridades() { return repo.porPrioridade(); }
    public List<EvolucaoMensalResponse> evolucao(int ano) { return repo.evolucao(ano); }
    public DashboardOperacionalResponse dashboard(Long usuarioId) {
        var r=metricas.resumo(usuarioId);
        Map<String,Long> distribuicao=new LinkedHashMap<>();
        repo.porPrioridade().forEach(p->distribuicao.put(p.grupo(),p.quantidade()));
        return new DashboardOperacionalResponse(r.incidentesCriticos(),r.slasEmRisco(),
                repo.atividadesRecentes(LocalDateTime.now().minusHours(24)),distribuicao,
                repo.prioritarios(usuarioId).stream().map(id->chamados.buscar(id,usuarioId)).toList());
    }
}
