package com.labware.api.service;
import com.labware.api.repository.*;
import com.labware.api.model.entity.Usuario;
import com.labware.api.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
@Service @RequiredArgsConstructor
public class LeituraChamadoService {
    private final JdbcTemplate jdbc;
    private final ChamadoRepository chamados;
    private final UsuarioRepository usuarios;
    private final AcessoChamadoService acesso;
    public boolean temNova(Long chamadoId,Usuario usuario) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(
              SELECT 1 FROM mensagens m
              JOIN chamado c ON c.id=m.chamado_id
              JOIN usuario autor ON autor.id=m.usuario_id
              WHERE m.chamado_id=? AND m.usuario_id<>?
                AND c.status IN ('ABERTO','EM_ANALISE','EM_ATENDIMENTO','AGUARDANDO_CLIENTE')
                AND NOT m.visivel_apenas_suporte
                AND ((? AND autor.perfil='CLIENTE')
                     OR (NOT ? AND autor.perfil IN ('SUPORTE','ADMIN')))
                AND m.id>COALESCE((SELECT ultima_mensagem_id FROM leitura_chamado WHERE chamado_id=? AND usuario_id=?),0))
            """,Boolean.class,chamadoId,usuario.getId(),acesso.ehSuporte(usuario),acesso.ehSuporte(usuario),chamadoId,usuario.getId()));
    }
    @Transactional
    public void marcar(Long chamadoId,Long usuarioId) {
        var c=chamados.findById(chamadoId).orElseThrow(()->new ResourceNotFoundException("Chamado não encontrado"));
        var u=usuarios.findById(usuarioId).orElseThrow(()->new ResourceNotFoundException("Usuário não encontrado"));
        acesso.exigir(c,u);
        jdbc.update("""
            INSERT INTO leitura_chamado(usuario_id,chamado_id,ultima_mensagem_id)
            SELECT ?,?,COALESCE(max(id),0) FROM mensagens WHERE chamado_id=? AND (? OR NOT visivel_apenas_suporte)
            ON CONFLICT(usuario_id,chamado_id) DO UPDATE
            SET ultima_mensagem_id=greatest(leitura_chamado.ultima_mensagem_id,excluded.ultima_mensagem_id)
            """,usuarioId,chamadoId,chamadoId,acesso.ehSuporte(u));
    }
}
