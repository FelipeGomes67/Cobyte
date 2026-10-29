package com.labware.api.service;

import com.labware.api.dto.request.AbrirChamadoRequest;
import com.labware.api.dto.response.ChamadoResponse;
import com.labware.api.model.entity.Chamado;
import com.labware.api.model.enums.OrigemChamado;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.repository.ChamadoRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChamadoService {

    private final ChamadoRepository chamadoRepository;

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


    public ChamadoResponse abrirChamado(AbrirChamadoRequest request) {
        Chamado chamado = new Chamado();

        chamado.setTitulo(request.getTitulo());
        chamado.setDescricao(request.getDescricao());
        chamado.setPrioridade(request.getPrioridade());
        chamado.setCategoria(request.getCategoria());

        chamado.setStatus(StatusChamado.ABERTO);
        chamado.setOrigem(OrigemChamado.TEXTO);

        // O solicitante e a empresa serão definidos
        // na integração com a autenticação.

        Chamado salvo = chamadoRepository.save(chamado);

        return converterParaResponse(salvo);
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
