
package com.labware.api.repository;

import com.labware.api.model.entity.Chamado;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChamadoRepository
        extends JpaRepository<Chamado, Long> {
}
