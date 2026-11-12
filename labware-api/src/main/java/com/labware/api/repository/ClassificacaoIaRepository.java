package com.labware.api.repository;

import com.labware.api.model.entity.ClassificacaoIa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClassificacaoIaRepository extends JpaRepository<ClassificacaoIa, Long> {
    java.util.List<ClassificacaoIa> findByChamadoIdIn(java.util.Collection<Long> chamadoIds);

    Optional<ClassificacaoIa> findByChamadoId(Long chamadoId);
}