package com.cobyte.api.service;

import com.cobyte.api.model.entity.Chamado;
import com.cobyte.api.model.entity.Usuario;
import com.cobyte.api.model.enums.PerfilUsuario;
import com.cobyte.api.model.enums.Prioridade;
import com.cobyte.api.model.enums.StatusChamado;
import com.cobyte.api.repository.ChamadoRepository;
import com.cobyte.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertasChamadoService {
    private final ChamadoRepository chamados;
    private final UsuarioRepository usuarios;
    private final NotificacaoService notificacoes;
    private final TransactionTemplate tx;
    private static final List<StatusChamado> ATIVOS = List.of(StatusChamado.ABERTO, StatusChamado.EM_ANALISE,
            StatusChamado.EM_ATENDIMENTO, StatusChamado.AGUARDANDO_CLIENTE);

    @Scheduled(fixedDelayString = "${cobyte.alertas.intervalo-ms:30000}", initialDelayString = "${cobyte.alertas.inicio-ms:10000}")
    public void verificar() {
        var agora = LocalDateTime.now();
        for (var id : chamados.buscarAlertasPendentes(ATIVOS, agora, agora.plusHours(1), PageRequest.of(0, 100))) {
            try {
                tx.executeWithoutResult(estado -> processar(id));
            } catch (RuntimeException erro) {
                log.warn("Não foi possível gerar alertas do chamado {} ({})", id, erro.getClass().getSimpleName());
            }
        }
    }

    private void processar(Long id) {
        // O bloqueio e os marcadores persistidos evitam duplicação entre instâncias da API.
        var c = chamados.findParaAvaliacao(id).orElse(null);
        if (c == null || !ATIVOS.contains(c.getStatus())) return;
        var agora = LocalDateTime.now();
        if (c.getPrioridade() == Prioridade.CRITICA && c.getAlertaCriticoEnviadoEm() == null) {
            emitir(c, "CHAMADO_CRITICO", "Atenção: chamado crítico",
                    "O chamado " + c.getProtocolo() + " está com prioridade Crítica e exige atenção imediata da equipe.");
            c.setAlertaCriticoEnviadoEm(agora);
        }
        var prazo = c.getPrazoResolucao();
        if (c.getStatus() == StatusChamado.AGUARDANDO_CLIENTE || prazo == null || c.getPrioridade() == null
                || !prazo.isAfter(agora)
                || prazo.isAfter(agora.plusHours(1)) || Objects.equals(prazo, c.getAlertaSlaPrazoNotificado())) return;
        long minutos = Math.max(1, (Duration.between(agora, prazo).getSeconds() + 59) / 60);
        emitir(c, "SLA_EM_RISCO", "SLA próximo do vencimento",
                "Restam aproximadamente " + minutos + " minutos para o prazo do chamado " + c.getProtocolo()
                        + ". Prioridade: " + c.getPrioridade().descricaoFormatada() + ". Confira o atendimento antes do vencimento.");
        c.setAlertaSlaPrazoNotificado(prazo);
    }

    private void emitir(Chamado c, String tipo, String titulo, String mensagem) {
        var destinatarios = new LinkedHashMap<Long, Usuario>();
        if (c.getSolicitante() != null) destinatarios.put(c.getSolicitante().getId(), c.getSolicitante());
        boolean temTecnico = false;
        if (c.getResponsavel() != null && c.getResponsavel().getPerfil() == PerfilUsuario.SUPORTE) {
            destinatarios.put(c.getResponsavel().getId(), c.getResponsavel()); temTecnico = true;
        }
        for (var tecnico : c.getTecnicos()) {
            if (tecnico.getPerfil() == PerfilUsuario.SUPORTE) {
                destinatarios.put(tecnico.getId(), tecnico); temTecnico = true;
            }
        }
        if (!temTecnico) usuarios.findByPerfil(PerfilUsuario.SUPORTE)
                .forEach(u -> destinatarios.put(u.getId(), u));
        destinatarios.values().forEach(u -> notificacoes.emitir(u, null, c, tipo, titulo, mensagem,
                "Monitoramento Cobyte", "Abra o chamado para conferir o contexto e o prazo atualizado."));
    }
}
