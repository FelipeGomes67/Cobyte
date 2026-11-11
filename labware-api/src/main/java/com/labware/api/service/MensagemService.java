package com.labware.api.service;

import com.labware.api.dto.request.CriarMensagemRequest;
import com.labware.api.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import com.labware.api.dto.response.MensagemResponse;
import com.labware.api.model.entity.Chamado;
import com.labware.api.model.entity.HistoricoChamado;
import com.labware.api.model.entity.Mensagem;
import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.model.enums.TipoMensagem;
import com.labware.api.repository.ChamadoRepository;
import com.labware.api.repository.AnexoRepository;
import com.labware.api.model.entity.Anexo;
import com.labware.api.repository.HistoricoChamadoRepository;
import com.labware.api.repository.MensagemRepository;
import com.labware.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MensagemService {

    private final MensagemRepository mensagemRepository;
    private final ChamadoRepository chamadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final HistoricoChamadoRepository historicoRepository;
    private final AcessoChamadoService acesso;
    private final AnexoRepository anexoRepository;
    private final NotificacaoService notificacoes;

    @Transactional
    public MensagemResponse enviar(Long chamadoId, Long usuarioId, CriarMensagemRequest req) {
        return enviar(chamadoId, usuarioId, req, TipoMensagem.TEXTO);
    }

    @Transactional
    public MensagemResponse enviarTranscricao(Long chamadoId, Long usuarioId, CriarMensagemRequest req) {
        return enviar(chamadoId, usuarioId, req, TipoMensagem.AUDIO);
    }

    private MensagemResponse enviar(Long chamadoId, Long usuarioId, CriarMensagemRequest req, TipoMensagem tipo) {
        Chamado chamado = buscarChamado(chamadoId);
        Usuario autor = buscarUsuario(usuarioId);
        acesso.exigir(chamado, autor);

        if (req.conteudo() == null || req.conteudo().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O texto da mensagem é obrigatório");
        }

        if (chamado.getStatus() == StatusChamado.RESOLVIDO || chamado.getStatus() == StatusChamado.FECHADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chamado encerrado não aceita novas mensagens");
        }

        boolean ehSuporte = acesso.ehSuporte(autor);
        boolean visivel = !req.visivelApenasSuporte();

        if (!ehSuporte && !visivel) {
            throw new AccessDeniedException(
                    "Somente o suporte pode criar notas internas");
        }

        Anexo anexo = null;
        if (req.anexoId() != null) {
            anexo = anexoRepository.findById(req.anexoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Anexo não encontrado"));
            acesso.exigir(anexo.getChamado(), autor);
            if (!anexo.getChamado().getId().equals(chamadoId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexo deve pertencer ao mesmo chamado da mensagem");
            }
        }

        Mensagem mensagem = mensagemRepository.save(Mensagem.builder()
                .chamado(chamado)
                .usuario(autor)
                .anexo(anexo)
                .tipo(tipo)
                .conteudo(req.conteudo())
                .visivelApenasSuporte(!visivel)
                .build());

        // Primeira resposta do suporte ao cliente: alimenta o SLA
        if (ehSuporte && visivel && chamado.getPrimeiraRespostaEm() == null) {
            chamado.setPrimeiraRespostaEm(LocalDateTime.now());
            registrarHistorico(chamado, autor, null,
                    chamado.getPrimeiraRespostaEm().toString());
        }

        // Cliente respondeu enquanto o suporte aguardava: o chamado volta para atendimento
        if (!ehSuporte && chamado.getStatus() == StatusChamado.AGUARDANDO_CLIENTE) {
            registrarHistorico(chamado, autor,
                    StatusChamado.AGUARDANDO_CLIENTE.name(), StatusChamado.EM_ATENDIMENTO.name());
            chamado.setStatus(StatusChamado.EM_ATENDIMENTO);
            if(chamado.getResponsavel()!=null)
                notificacoes.emitir(chamado.getResponsavel(),usuarioId,chamado,"STATUS","Status atualizado",chamado.getProtocolo()+" · EM_ATENDIMENTO");
            else notificacoes.emitirParaSuportes(usuarioId,chamado,"STATUS","Status atualizado",chamado.getProtocolo()+" · EM_ATENDIMENTO");
        }

        if (ehSuporte && visivel) {
            notificacoes.emitir(chamado.getSolicitante(),usuarioId,chamado,"MENSAGEM","Nova mensagem do suporte",chamado.getProtocolo());
        } else if (chamado.getResponsavel()!=null) {
            notificacoes.emitir(chamado.getResponsavel(),usuarioId,chamado,"MENSAGEM",visivel?"Nova mensagem do cliente":"Nova nota interna",chamado.getProtocolo());
        } else {
            notificacoes.emitirParaSuportes(usuarioId,chamado,"MENSAGEM",visivel?"Nova mensagem do cliente":"Nova nota interna",chamado.getProtocolo());
        }
        return MensagemResponse.from(mensagem);
    }

    @Transactional(readOnly = true)
    public List<MensagemResponse> listar(Long chamadoId, Long usuarioId) {
        Chamado chamado = buscarChamado(chamadoId);
        Usuario usuario = buscarUsuario(usuarioId);
        acesso.exigir(chamado, usuario);

        List<Mensagem> mensagens = acesso.ehSuporte(usuario)
                ? mensagemRepository.findByChamadoIdOrderByCriadoEmAscIdAsc(chamadoId)
                : mensagemRepository.findByChamadoIdAndVisivelApenasSuporteFalseOrderByCriadoEmAscIdAsc(chamadoId);

        return mensagens.stream().map(MensagemResponse::from).toList();
    }

    // ---------------------------------------------------------------

    private Chamado buscarChamado(Long id) {
        return chamadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException( "Chamado não encontrado"));
    }

    private Usuario buscarUsuario(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException( "Usuário não encontrado"));
    }

    private void registrarHistorico(Chamado chamado, Usuario usuario, String anterior, String novo) {
        historicoRepository.save(HistoricoChamado.builder()
                .chamado(chamado)
                .usuario(usuario)
                .valorAnterior(anterior)
                .valorNovo(novo)
                .build());
    }
}

