package com.labware.api.repository;

import com.labware.api.model.entity.Mensagem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    @EntityGraph(attributePaths = {"usuario", "chamado", "anexo"})
    List<Mensagem> findByChamadoIdOrderByCriadoEmAscIdAsc(Long chamadoId);
    @EntityGraph(attributePaths = {"usuario", "chamado", "anexo"})
    List<Mensagem> findByChamadoIdAndVisivelApenasSuporteFalseOrderByCriadoEmAscIdAsc(Long chamadoId);
}
