package com.cobyte.api.service;
import com.cobyte.api.repository.*;
import com.cobyte.api.model.entity.Usuario;
import com.cobyte.api.model.entity.LeituraChamado;
import com.cobyte.api.exception.ResourceNotFoundException;
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
    private final LeituraChamadoRepository leituras;
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
    public void marcar(Long chamadoId,Long usuarioId,long ultimaMensagemId) {
        if (ultimaMensagemId < 0) throw new IllegalArgumentException("Marcador de leitura invalido");
        // Serializa atualizacoes do marcador para impedir regressao em requisicoes concorrentes.
        var c=chamados.findParaAvaliacao(chamadoId).orElseThrow(()->new ResourceNotFoundException("Chamado não encontrado"));
        var u=usuarios.findById(usuarioId).orElseThrow(()->new ResourceNotFoundException("Usuário não encontrado"));
        acesso.exigirLeitura(c,u);
        Long ultimaVisivel = jdbc.queryForObject("""
            SELECT COALESCE(max(id),0) FROM mensagens
            WHERE chamado_id=? AND id<=? AND (? OR NOT visivel_apenas_suporte)
            """,Long.class,chamadoId,ultimaMensagemId,acesso.ehSuporte(u));
        var chave = new LeituraChamado.Id(usuarioId, chamadoId);
        var leitura = leituras.findById(chave).orElseGet(() -> {
            var nova = new LeituraChamado();
            nova.setId(chave); nova.setUsuario(u); nova.setChamado(c);
            return nova;
        });
        leitura.setUltimaMensagemId(Math.max(leitura.getUltimaMensagemId(), ultimaVisivel == null ? 0L : ultimaVisivel));
        leituras.save(leitura);
    }
}
