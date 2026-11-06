package com.labware.api.repository;

import com.labware.api.model.entity.HistoricoChamado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HistoricoChamadoRepository extends JpaRepository<HistoricoChamado, Long> {
    List<HistoricoChamado> findByChamadoIdOrderByAlteradoEmAsc(Long chamadoId);
}