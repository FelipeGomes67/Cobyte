package com.labware.api.service;
import com.labware.api.dto.response.*;
import com.labware.api.model.entity.*;
import com.labware.api.model.enums.*;
import com.labware.api.repository.*;
import com.labware.api.exception.ResourceNotFoundException;
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
    @Value("${spring.ai.ollama.chat.options.model}") private String modelo;
    public TriagemResponse buscar(Long id) {
        return tx.execute(s->TriagemResponse.from(classificacoes.findByChamadoId(id)
                .orElseThrow(()->new ResourceNotFoundException("Classificação não encontrada"))));
    }
    public TriagemResponse reclassificar(Long id) {
        String[] entrada=tx.execute(s->{ var c=buscarChamado(id); validar(c); return new String[]{c.getTitulo(),c.getDescricao()}; });
        var r=classificador.classificar(entrada[0],entrada[1])
                .orElseThrow(()->new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"IA indisponível ou resposta inválida; sugestões anteriores preservadas"));
        return tx.execute(s->{
            var c=chamados.findParaAvaliacao(id).orElseThrow(()->new ResourceNotFoundException("Chamado não encontrado")); validar(c);
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
            if (c.getStatus() == StatusChamado.EM_ANALISE && (c.getCategoria() == null || eraFallback)) {
                c.setCategoria(r.categoria());
                c.setPrioridade(r.prioridade());
                c.setPrazoResolucao(r.prioridade().minutosResolucao() == null ? null : c.getAbertoEm().plusMinutes(r.prioridade().minutosResolucao()));
                c.setPrazoPrimeiraResposta(null);
                if (r.prioridade().minutosResolucao() != null) {
                    politicas.findByPrioridade(r.prioridade()).ifPresent(p ->
                            c.setPrazoPrimeiraResposta(c.getAbertoEm().plusMinutes(p.getMinutosPrimeiraResposta())));
                }
            }
            ia.setTecnicoSugerido(null);
            ia.setSlaMetaMinutos(r.prioridade().minutosResolucao());
            return TriagemResponse.from(classificacoes.save(ia));
        });
    }
    private Chamado buscarChamado(Long id) { return chamados.findById(id).orElseThrow(()->new ResourceNotFoundException("Chamado não encontrado")); }
    private void validar(Chamado c) {
        if(c.getStatus()==StatusChamado.RESOLVIDO || c.getStatus().finalizado())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Chamado encerrado não pode ser triado novamente");
    }
}
