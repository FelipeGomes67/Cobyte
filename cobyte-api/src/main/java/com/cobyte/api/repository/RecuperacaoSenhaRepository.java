package com.cobyte.api.repository;

import com.cobyte.api.model.entity.RecuperacaoSenha;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface RecuperacaoSenhaRepository extends JpaRepository<RecuperacaoSenha, String> {
    Optional<RecuperacaoSenha> findByUsuarioId(Long usuarioId);
    @Modifying
    @Query("delete from RecuperacaoSenha r where r.usuario.id = :id")
    void excluirPorUsuario(@Param("id") Long id);
}
