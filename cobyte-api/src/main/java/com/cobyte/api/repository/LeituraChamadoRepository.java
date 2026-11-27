package com.cobyte.api.repository;

import com.cobyte.api.model.entity.LeituraChamado;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeituraChamadoRepository extends JpaRepository<LeituraChamado, LeituraChamado.Id> { }
