package com.cobyte.api.service;
import com.cobyte.api.dto.response.*;
import com.cobyte.api.model.entity.*;
import com.cobyte.api.model.enums.*;
import com.cobyte.api.repository.*;
import com.cobyte.api.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDateTime;
@Service @RequiredArgsConstructor
public class TriagemService {
    private final ChamadoRepository chamados;
    private final ClassificacaoIaRepository classificacoes;
    private final PoliticaSlaRepository politicas;
    private final ClassificadorIaService classificador;
    private final TransactionTemplate tx;
    private final UsuarioRepository usuarios;
    private final AcessoChamadoService acesso;
    @Value("${spring.ai.ollama.chat.options.model}") private String modelo;
    public TriagemResponse buscar(Long id) {
        return tx.execute(s->TriagemResponse.from(classificacoes.findByChamadoId(id)
                .orElseThrow(()->new ResourceNotFoundException("Classificação não encontrada"))));
    }
    public TriagemResponse reclassificar(Long id, Long usuarioId) {
        String[] entrada = tx.execute(s -> {
            var chamado = buscarChamado(id);
            validar(chamado, usuarioId);
            return new String[]{chamado.getTitulo(), chamado.getDescricao()};
        });
        var r=classificador.classificar(entrada[0],entrada[1])
                .orElseThrow(()->new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"IA indisponível ou resposta inválida; sugestões anteriores preservadas"));
        return tx.execute(s->{
            var c=chamados.findParaAvaliacao(id).orElseThrow(()->new ResourceNotFoundException("Chamado não encontrado"));
            validar(c, usuarioId);
            var ia=classificacoes.findByChamadoId(id).orElseGet(()->ClassificacaoIa.builder().chamado(c).build());
            // Atualiza a classificação do chamado se não possuía categoria ou se usava triagem de fallback inicial
            boolean eraFallback = ia.getJustificativa() != null && (
                    ia.getJustificativa().contains("Triagem padrão aplicada") ||
                    ia.getJustificativa().contains("[Emergência]") || ia.getJustificativa().contains("[Padrão]") ||
                    ia.getJustificativa().contains("triagem de emergência") ||
                    ia.getJustificativa().contains("indisponibilidade/falha")
            );

            ia.setTituloGeradoIa(r.tituloGeradoIa()); ia.setCategoriaSugerida(r.categoria()); ia.setPrioridadeSugerida(r.prioridade());
            ia.setSintomaObservadoIa(r.resumoTecnicoIa()==null?null:r.resumoTecnicoIa().sintomaObservado());
            ia.setImpactoOperacionalIa(r.resumoTecnicoIa()==null?null:r.resumoTecnicoIa().impactoOperacional());
            ia.setJustificativa(r.justificativa()); ia.setModelo(modelo); ia.setClassificadaEm(LocalDateTime.now());
            if (c.getStatus() == StatusChamado.EM_ANALISE && ia.getPrioridadeFinal() == null && ia.getCategoriaFinal() == null
                    && (c.getCategoriaPersonalizada() == null && (c.getCategoria() == null || eraFallback))) {
                c.setCategoria(r.categoria());
                c.setPrioridade(r.prioridade());
                c.setPrazoResolucao(r.prioridade() == null || r.prioridade().minutosResolucao() == null ? null : c.getAbertoEm().plusMinutes(r.prioridade().minutosResolucao()).plus(c.duracaoPausasEncerradas()));
                c.setPrazoPrimeiraResposta(null);
                if (r.prioridade() != null && r.prioridade().minutosResolucao() != null) {
                    politicas.findByPrioridade(r.prioridade()).ifPresent(p ->
                            c.setPrazoPrimeiraResposta(c.getAbertoEm().plusMinutes(p.getMinutosPrimeiraResposta())));
                }
            }
            ia.setTecnicoSugerido(null);
            ia.setSlaMetaMinutos(r.prioridade() == null ? null : r.prioridade().minutosResolucao());
            return TriagemResponse.from(classificacoes.save(ia));
        });
    }
    private Chamado buscarChamado(Long id) { return chamados.findById(id).orElseThrow(()->new ResourceNotFoundException("Chamado não encontrado")); }
    private void validar(Chamado c, Long usuarioId) {
        var usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        if (!acesso.ehSuporte(usuario)) throw new org.springframework.security.access.AccessDeniedException("Acesso negado");
        acesso.exigirEdicao(c, usuario);
        if(c.getStatus()==StatusChamado.RESOLVIDO || c.getStatus().finalizado())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Chamado encerrado não pode ser triado novamente");
    }
}
