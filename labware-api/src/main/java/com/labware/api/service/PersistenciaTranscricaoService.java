package com.labware.api.service;

import com.labware.api.dto.request.CriarMensagemRequest;
import com.labware.api.dto.response.TranscricaoResponse;
import com.labware.api.exception.ResourceNotFoundException;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.repository.ChamadoRepository;
import com.labware.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PersistenciaTranscricaoService {
    private final ChamadoRepository chamados;
    private final UsuarioRepository usuarios;
    private final AcessoChamadoService acesso;
    private final MensagemService mensagens;
    private final AnexoService anexos;
    private final com.labware.api.repository.AnexoRepository anexoRepository;

    @Transactional(readOnly = true)
    public void verificar(Long chamadoId, Long usuarioId, boolean salvarAnexo, boolean salvarMensagem, boolean interna) {
        var chamado = chamados.findById(chamadoId).orElseThrow(() -> new ResourceNotFoundException("Chamado não encontrado"));
        var usuario = usuarios.findById(usuarioId).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        acesso.exigir(chamado, usuario);
        if (interna && !acesso.ehSuporte(usuario)) throw new AccessDeniedException("Somente o suporte pode criar notas internas");
        if (interna && (!salvarMensagem || salvarAnexo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Nota interna exige salvarMensagem=true e salvarAnexo=false; anexos são visíveis ao cliente");
        }
        if (salvarMensagem && chamado.getStatus().finalizado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chamado fechado não aceita mensagens");
        }
    }

    @Transactional
    public void salvar(Long chamadoId, Long usuarioId, MultipartFile arquivo, TranscricaoResponse dto,
                       boolean salvarAnexo, boolean salvarMensagem, boolean interna) {
        // Repete a autorizacao/status depois da inferencia, sem manter transacao durante o HTTP.
        verificar(chamadoId, usuarioId, salvarAnexo, salvarMensagem, interna);
        if (salvarMensagem && dto.transcricao().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Não foi detectada fala para salvar como mensagem");
        }
        Long anexoId = salvarAnexo ? anexos.enviar(chamadoId, usuarioId, arquivo).id() : null;
        if (anexoId != null) anexoRepository.findById(anexoId).orElseThrow().setDuracaoAudioSegundos(dto.duracaoSegundos());
        if (salvarMensagem) {
            mensagens.enviarTranscricao(chamadoId, usuarioId, new CriarMensagemRequest(dto.transcricao(), interna, anexoId));
        }
    }
}
