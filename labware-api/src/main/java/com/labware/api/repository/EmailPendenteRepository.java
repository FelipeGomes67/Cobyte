package com.labware.api.repository;

import com.labware.api.model.entity.EmailPendente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;

public interface EmailPendenteRepository extends JpaRepository<EmailPendente, Long> {
    // O bloqueio dura até o commit; outras instâncias ignoram o envio em andamento.
    @Query(value = """
            select * from email_pendente
             where estado = 'PENDENTE' and proxima_tentativa <= :agora
             order by proxima_tentativa, id
             limit 1 for update skip locked
            """, nativeQuery = true)
    Optional<EmailPendente> bloquearProximo(@Param("agora") Instant agora);
}
