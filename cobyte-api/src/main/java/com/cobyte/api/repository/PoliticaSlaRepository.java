package com.cobyte.api.repository;

import com.cobyte.api.model.entity.PoliticaSla;
import com.cobyte.api.model.enums.Prioridade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoliticaSlaRepository extends JpaRepository<PoliticaSla, Long> {
    Optional<PoliticaSla> findByPrioridade(Prioridade prioridade);
}