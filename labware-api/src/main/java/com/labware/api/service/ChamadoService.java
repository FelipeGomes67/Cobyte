package com.labware.api.service;

import com.labware.api.dto.request.AbrirChamadoRequest;
import com.labware.api.dto.response.ChamadoResponse;
import com.labware.api.model.entity.Chamado;
import com.labware.api.model.enums.OrigemChamado;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.repository.ChamadoRepository;
import com.labware.api.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChamadoService {

    private final ChamadoRepository chamadoRepository;
    private final UsuarioRepository usuarioRepository;

    public List<ChamadoResponse> listarTodos(){
     return chamadoRepository.findAll()
             .stream()
             .map(this::converterParaResponse)
             .toList();
    }

    public ChamadoResponse buscarPorId(Long id) {
        Chamado chamado = chamadoRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Chamado não encontrado")
                        );
        return converterParaResponse(chamado);
    }

    public ChamadoResponse atualizar(
            Long id,
            AbrirChamadoRequest request){

        Chamado chamado = chamadoRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Chamado não encontrado")
                        );

        chamado.setTitulo(request.getTitulo());
        chamado.setDescricao(request.getDescricao());
        chamado.setPrioridade(request.getPrioridade());
        chamado.setCategoria(request.getCategoria());

        Chamado atualizado = chamadoRepository.save(chamado);

        return converterParaResponse(atualizado);
    }


    @Transactional
    public ChamadoResponse abrirChamado(Long solicitanteId, AbrirChamadoRequest request) {
        var solicitante = usuarioRepository.findById(solicitanteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário inválido"));
        var empresa = solicitante.getEmpresa();
        if (empresa == null || !empresa.isAtiva()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vincule-se a uma empresa ativa antes de abrir chamados");
        }

        Chamado chamado = new Chamado();

        chamado.setProtocolo(gerarProtocolo());
        chamado.setTitulo(request.getTitulo());
        chamado.setDescricao(request.getDescricao());
        chamado.setPrioridade(request.getPrioridade());
        chamado.setCategoria(request.getCategoria());

        chamado.setStatus(StatusChamado.ABERTO);
        chamado.setOrigem(OrigemChamado.TEXTO);
        chamado.setSolicitante(solicitante);
        chamado.setEmpresa(empresa);

        Chamado salvo = chamadoRepository.saveAndFlush(chamado);

        return converterParaResponse(salvo);
    }

    private String gerarProtocolo() {
        return "CH" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
    }

    private ChamadoResponse converterParaResponse
            (Chamado chamado) {

        return ChamadoResponse.builder()
                .id(chamado.getId())
                .protocolo(chamado.getProtocolo())
                .titulo(chamado.getTitulo())
                .descricao(chamado.getDescricao())
                .status(chamado.getStatus())
                .prioridade(chamado.getPrioridade())
                .categoria(chamado.getCategoria())
                .origem(chamado.getOrigem())
                .abertoEm(chamado.getAbertoEm())
                .empresaId(
                        chamado.getEmpresa() != null
                                ? chamado.getEmpresa().getId()
                                : null
                )
                .solicitanteId(
                        chamado.getSolicitante() != null
                                ? chamado.getSolicitante().getId()
                                : null
                )
                .responsavelId(
                        chamado.getResponsavel() != null
                                ? chamado.getResponsavel().getId()
                                : null
                )
                .primeiraRespostaEm(chamado.getPrimeiraRespostaEm())
                .resolvidoEm(chamado.getResolvidoEm())
                .prazoPrimeiraResposta(chamado.getPrazoPrimeiraResposta())
                .prazoResolucao(chamado.getPrazoResolucao())
                .build();
    }



}
