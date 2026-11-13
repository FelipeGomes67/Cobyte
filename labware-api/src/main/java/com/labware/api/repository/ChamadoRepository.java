package com.labware.api.repository;

import com.labware.api.model.entity.Chamado;
import com.labware.api.model.enums.StatusChamado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

public interface ChamadoRepository extends JpaRepository<Chamado, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Chamado> {
    @Query("select new com.labware.api.dto.response.ResumoAvaliacoesResponse(avg(a.notaAvaliacao), count(a)) from Chamado c join c.avaliacao a where c.responsavel.id = :usuarioId")
    com.labware.api.dto.response.ResumoAvaliacoesResponse resumirAvaliacoes(@Param("usuarioId") Long usuarioId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Chamado c WHERE c.id = :id")
    Optional<Chamado> findParaAvaliacao(@Param("id") Long id);

    @Query(value = """
            SELECT count(*) AS total,
                count(*) FILTER (WHERE status = 'ABERTO') AS "abertos",
                count(*) FILTER (WHERE status = 'EM_ANALISE') AS "emAnalise",
                count(*) FILTER (WHERE status = 'EM_ATENDIMENTO') AS "emAtendimento",
                count(*) FILTER (WHERE status = 'AGUARDANDO_CLIENTE') AS "aguardandoCliente",
                count(*) FILTER (WHERE status = 'RESOLVIDO') AS "resolvidos",
                count(*) FILTER (WHERE status = 'FECHADO') AS "fechados",
                count(*) FILTER (WHERE resolvido_em > prazo_resolucao) AS "resolvidosForaDoPrazo",
                count(*) FILTER (WHERE prioridade = 'CRITICA'
                    AND status NOT IN ('RESOLVIDO', 'FECHADO', 'CANCELADO')) AS "incidentesCriticos",
                count(*) FILTER (WHERE status NOT IN ('RESOLVIDO', 'FECHADO', 'CANCELADO') AND (
                    (primeira_resposta_em IS NULL AND prazo_primeira_resposta >= CAST(:agora AS timestamp)
                        AND trunc(extract(epoch FROM prazo_primeira_resposta - aberto_em)) > 0
                        AND trunc(extract(epoch FROM CAST(:agora AS timestamp) - aberto_em)) * 100 >=
                            trunc(extract(epoch FROM prazo_primeira_resposta - aberto_em)) * 80)
                    OR (resolvido_em IS NULL AND prazo_resolucao >= CAST(:agora AS timestamp)
                        AND trunc(extract(epoch FROM prazo_resolucao - aberto_em)) > 0
                        AND trunc(extract(epoch FROM CAST(:agora AS timestamp) - aberto_em)) * 100 >=
                            trunc(extract(epoch FROM prazo_resolucao - aberto_em)) * 80)
                )) AS "slasEmRisco"
            FROM chamado
            WHERE (CAST(:solicitanteId AS bigint) IS NULL OR solicitante_id = CAST(:solicitanteId AS bigint))
            """, nativeQuery = true)
    MetricasResumoRepository resumir(@Param("solicitanteId") Long solicitanteId,
                                     @Param("agora") LocalDateTime agora);

    @Query("""
            SELECT c.prioridade AS prioridade, count(c) AS quantidade
            FROM Chamado c
            WHERE (:solicitanteId IS NULL OR c.solicitante.id = :solicitanteId)
            GROUP BY c.prioridade
            """)
    List<PrioridadeContagemRepository> contarPorPrioridade(@Param("solicitanteId") Long solicitanteId);

    @Query("select count(distinct c) from Chamado c left join c.tecnicos t where (c.responsavel.id = :responsavelId or t.id = :responsavelId) and c.status not in :encerrados")
    long countByResponsavelIdAndStatusNotIn(@Param("responsavelId") Long responsavelId,
                                          @Param("encerrados") java.util.Collection<StatusChamado> encerrados);

    Optional<Chamado> findByProtocolo(String protocolo);
    List<Chamado> findBySolicitanteIdOrderByAbertoEmDesc(Long solicitanteId);
    List<Chamado> findByEmpresaIdOrderByAbertoEmDesc(Long empresaId);
    List<Chamado> findByStatusOrderByAbertoEmDesc(StatusChamado status);
    long countByAbertoEmBetween(java.time.LocalDateTime inicio, java.time.LocalDateTime fim);
}
