package com.labware.api.repository;

import com.labware.api.model.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    @org.springframework.data.jpa.repository.Query("""
            select u from Usuario u where u.perfil = com.labware.api.model.enums.PerfilUsuario.CLIENTE
              and (:busca = '' or lower(u.nome) like lower(concat('%', :busca, '%'))
                   or lower(u.email) like lower(concat('%', :busca, '%')))
            """)
    org.springframework.data.domain.Page<Usuario> listarClientes(
            @org.springframework.data.repository.query.Param("busca") String busca,
            org.springframework.data.domain.Pageable pageable);
    // Ordem única de bloqueio: serializa a distribuição de aberturas concorrentes.
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from Usuario u where u.perfil = com.labware.api.model.enums.PerfilUsuario.SUPORTE order by u.id")
    java.util.List<Usuario> buscarSuportesParaDistribuicao();

    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    java.util.List<Usuario> findByPerfil(com.labware.api.model.enums.PerfilUsuario perfil);
}
