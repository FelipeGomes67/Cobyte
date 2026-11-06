package com.labware.api.repository;

import com.labware.api.model.entity.Anexo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnexoRepository extends JpaRepository<Anexo, Long> {
    @EntityGraph(attributePaths = {"chamado", "usuario"})
    List<Anexo> findByChamadoIdOrderByEnviadoEmAscIdAsc(Long chamadoId);
}
