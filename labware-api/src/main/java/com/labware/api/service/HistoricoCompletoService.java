package com.labware.api.service;

import com.labware.api.dto.response.*;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.repository.*;
import com.labware.api.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class HistoricoCompletoService {
    private final UsuarioRepository usuarios;
    private final ChamadoRepository chamados;
    private final ClassificacaoIaRepository classificacoes;
    private final ChamadoService chamadoService;
    private final MensagemService mensagens;
    private final AnexoService anexos;
    private final AcessoChamadoService acesso;

    public PaginaResponse<ChamadoResponse> listar(Long usuarioId,String busca,int page,int size) {
        var usuario=usuarios.findById(usuarioId).orElseThrow(()->new ResourceNotFoundException("Usuário não encontrado"));
        boolean suporte=acesso.ehSuporte(usuario);
        org.springframework.data.jpa.domain.Specification<com.labware.api.model.entity.Chamado> spec=(root,q,cb)->{
            var p=new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            p.add(root.get("status").in(StatusChamado.RESOLVIDO,StatusChamado.FECHADO,StatusChamado.CANCELADO));
            if(!suporte)p.add(cb.equal(root.get("solicitante").get("id"),usuarioId));
            if(busca!=null&&!busca.isBlank()) {
                String termo=busca.trim().toLowerCase(java.util.Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_");
                p.add(cb.or(cb.like(cb.lower(root.get("titulo")),"%"+termo+"%",'!'),cb.like(cb.lower(root.get("protocolo")),"%"+termo+"%",'!')));
            }
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        return PaginaResponse.from(chamados.findAll(spec,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"resolvidoEm","id")))
                .map(c->ChamadoResponse.from(c,classificacoes.findByChamadoId(c.getId()).orElse(null), false)));
    }
    public HistoricoCompletoResponse buscar(Long id,Long usuarioId) {
        // Serviço existente aplica o controle de acesso antes de consultar os demais dados.
        var chamado=chamadoService.buscar(id,usuarioId);
        if(chamado.status()!=StatusChamado.RESOLVIDO && !chamado.status().finalizado())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Chamado ainda não está encerrado");
        var usuario=usuarios.findById(usuarioId).orElseThrow(()->new ResourceNotFoundException("Usuário não encontrado"));
        var ia=acesso.ehSuporte(usuario)?classificacoes.findByChamadoId(id).map(TriagemResponse::from).orElse(null):null;
        return new HistoricoCompletoResponse(chamado,mensagens.listar(id,usuarioId),anexos.listar(id,usuarioId),ia);
    }
}
