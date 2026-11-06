package com.labware.api.service;

import com.labware.api.dto.response.AnexoResponse;
import com.labware.api.exception.ResourceNotFoundException;
import com.labware.api.model.entity.Anexo;
import com.labware.api.model.entity.Chamado;
import com.labware.api.model.entity.Usuario;
import com.labware.api.repository.AnexoRepository;
import com.labware.api.repository.ChamadoRepository;
import com.labware.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnexoService {
    private final AnexoRepository anexoRepository;
    private final ChamadoRepository chamadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AcessoChamadoService acesso;
    private final ArmazenamentoService armazenamento;

    public record Download(Resource recurso, String nomeArquivo, long tamanhoBytes) {}

    @Transactional
    public AnexoResponse enviar(Long chamadoId, Long usuarioId, MultipartFile arquivo) {
        Chamado chamado = buscarChamado(chamadoId);
        Usuario usuario = buscarUsuario(usuarioId);
        acesso.exigir(chamado, usuario);
        var salvo = armazenamento.salvar(chamadoId, arquivo);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) limpar(chamadoId, salvo.caminhoArquivo());
                }
            });
        }
        try {
            Anexo anexo = anexoRepository.saveAndFlush(Anexo.builder().chamado(chamado).usuario(usuario)
                    .nomeArquivo(salvo.nomeArquivo()).tipoConteudo(salvo.tipoConteudo())
                    .caminhoArquivo(salvo.caminhoArquivo()).tamanhoBytes(salvo.tamanhoBytes()).build());
            return AnexoResponse.from(anexo);
        } catch (RuntimeException ex) {
            limpar(chamadoId, salvo.caminhoArquivo());
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<AnexoResponse> listar(Long chamadoId, Long usuarioId) {
        acesso.exigir(buscarChamado(chamadoId), buscarUsuario(usuarioId));
        return anexoRepository.findByChamadoIdOrderByEnviadoEmAscIdAsc(chamadoId).stream()
                .map(AnexoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Download baixar(Long anexoId, Long usuarioId) {
        Anexo anexo = anexoRepository.findById(anexoId)
                .orElseThrow(() -> new ResourceNotFoundException("Anexo não encontrado"));
        acesso.exigir(anexo.getChamado(), buscarUsuario(usuarioId));
        return new Download(armazenamento.carregar(anexo.getChamado().getId(), anexo.getCaminhoArquivo()),
                anexo.getNomeArquivo(), anexo.getTamanhoBytes());
    }

    private Chamado buscarChamado(Long id) {
        return chamadoRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Chamado não encontrado"));
    }

    private Usuario buscarUsuario(Long id) {
        return usuarioRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    private void limpar(Long chamadoId, String caminho) {
        try { armazenamento.excluir(chamadoId, caminho); }
        catch (RuntimeException ex) { log.error("Falha ao limpar upload sem registro do chamado {}", chamadoId, ex); }
    }
}
