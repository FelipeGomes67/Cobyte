package com.cobyte.api.repository;
import com.cobyte.api.model.entity.Notificacao;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
public interface NotificacaoRepository extends JpaRepository<Notificacao,Long> {
    @Query("""
            select count(n) from Notificacao n
            left join n.chamado c
            left join c.empresa empresaChamado
            left join n.usuario.empresa empresaUsuario
            where n.usuario.id = :usuarioId and n.lida = false
              and (:cliente = false or c is null or empresaChamado.id = empresaUsuario.id)
            """)
    long contarNaoLidasVisiveis(@org.springframework.data.repository.query.Param("usuarioId") Long usuarioId,
                              @org.springframework.data.repository.query.Param("cliente") boolean cliente);
    @Query("""
            select n from Notificacao n
            left join n.chamado c
            left join c.empresa empresaChamado
            left join n.usuario.empresa empresaUsuario
            where n.usuario.id = :usuarioId
              and (:cliente = false or c is null or empresaChamado.id = empresaUsuario.id)
              and (:filtro = 'todas'
                   or (:filtro = 'nao-lidas' and n.lida = false)
                   or (:filtro = 'mensagens' and n.tipo = 'MENSAGEM')
                   or (:filtro in ('chamados', 'alertas') and c is not null and n.tipo <> 'MENSAGEM'))
            order by n.criadoEm desc, n.id desc
            """)
    @EntityGraph(attributePaths = "chamado")
    Page<Notificacao> filtrar(@org.springframework.data.repository.query.Param("usuarioId") Long usuarioId,
                            @org.springframework.data.repository.query.Param("cliente") boolean cliente,
                            @org.springframework.data.repository.query.Param("filtro") String filtro,
                            Pageable page);
    @EntityGraph(attributePaths="chamado")
    Page<Notificacao> findByUsuarioIdOrderByCriadoEmDescIdDesc(Long usuarioId,Pageable page);
    @Query("""
            select n from Notificacao n left join n.chamado c
            where n.usuario.id = :usuarioId
            and (c is null or c.empresa.id = n.usuario.empresa.id)
            order by n.criadoEm desc, n.id desc
            """)
    @EntityGraph(attributePaths = "chamado")
    Page<Notificacao> listarCliente(@org.springframework.data.repository.query.Param("usuarioId") Long usuarioId,
                                   Pageable page);
    @Query("""
            select n from Notificacao n left join n.chamado c
            where n.id=:id and n.usuario.id=:usuarioId
              and (n.usuario.perfil <> com.cobyte.api.model.enums.PerfilUsuario.CLIENTE
                   or c is null or c.empresa.id=n.usuario.empresa.id)
            """)
    java.util.Optional<Notificacao> findByIdAndUsuarioId(Long id,Long usuarioId);
    long countByUsuarioIdAndLidaFalse(Long usuarioId);
    @Modifying @Query("""
            update Notificacao n set n.lida=true where n.usuario.id=:usuarioId and n.lida=false
              and (n.chamado is null or exists (
                  select c.id from Chamado c, Usuario u
                  where c.id=n.chamado.id and u.id=:usuarioId
                    and (u.perfil <> com.cobyte.api.model.enums.PerfilUsuario.CLIENTE or c.empresa.id=u.empresa.id)
              ))
            """)
    int marcarTodas(Long usuarioId);
}
