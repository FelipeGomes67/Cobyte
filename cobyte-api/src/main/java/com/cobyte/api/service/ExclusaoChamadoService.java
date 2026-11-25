package com.cobyte.api.service;

import com.cobyte.api.exception.ResourceNotFoundException;
import com.cobyte.api.repository.ChamadoRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExclusaoChamadoService {
    private final ChamadoRepository chamados;
    private final EntityManager em;
    private final FileStorageService arquivos;

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public java.util.List<String> excluir(UUID publico) {
        var avisos = new java.util.ArrayList<String>();
        Long id = chamados.buscarIdInterno(publico)
                .orElseThrow(() -> new ResourceNotFoundException("Chamado não encontrado"));
        var chamado = chamados.findParaAvaliacao(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chamado não encontrado"));
        // Mensagens referenciam anexos: as tabelas filhas devem ser excluídas nesta ordem.
        for (String entidade : java.util.List.of("Notificacao", "LeituraChamado", "Mensagem",
                "HistoricoChamado", "PausaSla", "ClassificacaoIa", "Anexo")) {
            em.createQuery("delete from " + entidade + " e where e.chamado.id = :id")
                    .setParameter("id", id).executeUpdate();
        }
        em.createQuery("delete from ArquivoCompartilhado a where a.chave like :prefixo")
                .setParameter("prefixo", "anexos/" + id + "/%").executeUpdate();
        // Compatibilidade com eventuais e-mails enfileirados por versões anteriores.
        em.createQuery("delete from EmailPendente e where e.texto like :link")
                .setParameter("link", "%/chamados/" + publico + "%").executeUpdate();
        // O cascade existente remove a avaliação; o ORM também remove chamado_tecnico.
        em.remove(chamado);
        em.flush();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try { arquivos.excluirDiretorioChamado(id); }
                catch (RuntimeException erro) {
                    log.error("Chamado {} excluído; falha ao limpar arquivos locais. Requer limpeza no servidor.", id, erro);
                    avisos.add("Os registros foram excluídos, mas a limpeza dos arquivos locais falhou. Solicite a limpeza no servidor.");
                }
            }
        });
        return avisos;
    }
}
