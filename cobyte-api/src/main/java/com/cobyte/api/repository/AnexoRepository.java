package com.cobyte.api.repository;

import com.cobyte.api.model.entity.Anexo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnexoRepository extends JpaRepository<Anexo, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from Anexo a where a.id = :id")
    java.util.Optional<Anexo> buscarParaMigracao(@org.springframework.data.repository.query.Param("id") Long id);

    List<Anexo> findTop20ByIdGreaterThanOrderByIdAsc(Long id);
    @EntityGraph(attributePaths = {"chamado", "usuario"})
    List<Anexo> findByChamadoIdOrderByEnviadoEmAscIdAsc(Long chamadoId);

    @org.springframework.data.jpa.repository.Query("""
            select a from Anexo a where a.chamado.id = :chamadoId and not exists
            (select m.id from Mensagem m where m.anexo = a and m.visivelApenasSuporte = true)
            order by a.enviadoEm, a.id
            """)
    List<Anexo> listarPublicos(@org.springframework.data.repository.query.Param("chamadoId") Long chamadoId);
}
