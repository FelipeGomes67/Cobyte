package com.cobyte.api.repository;

import com.cobyte.api.model.entity.PausaSla;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PausaSlaRepository extends JpaRepository<PausaSla, Long> {
    List<PausaSla> findByChamadoIdOrderByInicioAscIdAsc(Long chamadoId);
}
