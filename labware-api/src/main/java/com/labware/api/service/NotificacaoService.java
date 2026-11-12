package com.labware.api.service;

import com.labware.api.model.entity.*;
import com.labware.api.dto.request.ConfiguracaoNotificacaoRequest;
import com.labware.api.dto.response.NotificacaoResponse;
import com.labware.api.repository.*;
import com.labware.api.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificacaoService {
    private final NotificacaoRepository notificacoes;
    private final UsuarioRepository usuarios;
    private final org.springframework.context.ApplicationEventPublisher eventos;

    @Transactional(readOnly = true)
    public Page<NotificacaoResponse> listar(Long id, int page, int size) {
        return notificacoes.findByUsuarioIdOrderByCriadoEmDescIdDesc(id, PageRequest.of(page, size)).map(NotificacaoResponse::from);
    }

    @Transactional(readOnly = true)
    public long contador(Long id) {
        return notificacoes.countByUsuarioIdAndLidaFalse(id);
    }

    public void marcarLida(Long id, Long usuarioId) {
        var n = notificacoes.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Notificação não encontrada"));
        n.setLida(true);
    }

    public void emitirParaSuportes(Long autorId, Chamado chamado, String tipo, String titulo, String texto) {
        usuarios.findByPerfil(com.labware.api.model.enums.PerfilUsuario.SUPORTE)
                .forEach(u -> emitir(u, autorId, chamado, tipo, titulo, texto));
    }

    public void marcarTodas(Long id) {
        notificacoes.marcarTodas(id);
    }

    @Transactional(readOnly = true)
    public ConfiguracaoNotificacaoRequest preferencias(Long id) {
        return preferenciasDe(usuario(id));
    }

    public ConfiguracaoNotificacaoRequest preferencias(Long id, ConfiguracaoNotificacaoRequest r) {
        var u = usuario(id);
        var p = new HashMap<String, Object>(u.getPreferenciasNotificacao() == null
                ? Collections.emptyMap() : u.getPreferenciasNotificacao());
        p.put("novasMensagens", r.novasMensagens());
        p.put("alteracoesStatus", r.alteracoesStatus());
        p.put("atribuicoes", r.atribuicoes());
        p.remove("notificarEmail");
        u.setPreferenciasNotificacao(p);
        return preferenciasDe(u);
    }

    public void emitir(Usuario destinatario, Long autorId, Chamado chamado, String tipo, String titulo, String texto) {
        if (destinatario == null || destinatario.getId().equals(autorId)) return;
        String chave = switch (tipo) {
            case "MENSAGEM" -> "novasMensagens";
            case "ATRIBUICAO" -> "atribuicoes";
            default -> "alteracoesStatus";
        };
        Map<String, Object> prefs = destinatario.getPreferenciasNotificacao() != null
                ? destinatario.getPreferenciasNotificacao()
                : Collections.emptyMap();
        if (!permitida(prefs, chave)) return;
        notificacoes.save(Notificacao.builder()
                .usuario(destinatario)
                .chamado(chamado)
                .tipo(tipo)
                .titulo(titulo)
                .mensagem(texto)
                .build());
        String status = chamado == null ? null : switch (chamado.getStatus()) {
            case ABERTO -> "Aberto";
            case EM_ANALISE -> "Em análise";
            case EM_ATENDIMENTO -> "Em atendimento";
            case AGUARDANDO_CLIENTE -> "Aguardando solicitante";
            case RESOLVIDO -> "Resolvido";
            case FECHADO -> "Fechado";
            case CANCELADO -> "Cancelado";
        };
        eventos.publishEvent(new EmailService.EmailNotificacao(destinatario.getEmail(), titulo, texto,
                destinatario.getNome(), chamado == null ? null : chamado.getId(),
                chamado == null ? null : chamado.getProtocolo(), chamado == null ? null : chamado.getTitulo(), status, tipo));
    }

    private boolean permitida(Map<String, Object> p, String chave) {
        return p == null || !Boolean.FALSE.equals(p.get(chave));
    }

    private ConfiguracaoNotificacaoRequest preferenciasDe(Usuario u) {
        var p = u.getPreferenciasNotificacao();
        return new ConfiguracaoNotificacaoRequest(permitida(p, "novasMensagens"),
                permitida(p, "alteracoesStatus"), permitida(p, "atribuicoes"));
    }

    private Usuario usuario(Long id) {
        return usuarios.findById(id).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }
}
