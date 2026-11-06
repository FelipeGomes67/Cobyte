package com.labware.api.repository;
import com.labware.api.model.entity.Notificacao;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
public interface NotificacaoRepository extends JpaRepository<Notificacao,Long> {
    @EntityGraph(attributePaths="chamado")
    Page<Notificacao> findByUsuarioIdOrderByCriadoEmDescIdDesc(Long usuarioId,Pageable page);
    java.util.Optional<Notificacao> findByIdAndUsuarioId(Long id,Long usuarioId);
    long countByUsuarioIdAndLidaFalse(Long usuarioId);
    @Modifying @Query("update Notificacao n set n.lida=true where n.usuario.id=:usuarioId and n.lida=false")
    int marcarTodas(Long usuarioId);
}
