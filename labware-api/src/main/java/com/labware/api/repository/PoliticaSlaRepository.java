package com.labware.api.repository;

import com.labware.api.model.entity.PoliticaSla;
import com.labware.api.model.enums.Prioridade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoliticaSlaRepository extends JpaRepository<PoliticaSla, Long> {
    Optional<PoliticaSla> findByPrioridade(Prioridade prioridade);
}