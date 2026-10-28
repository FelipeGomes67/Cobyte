package com.labware.api.controller;

import com.labware.api.dto.request.AbrirChamadoRequest;
import com.labware.api.dto.response.ChamadoResponse;
import com.labware.api.service.ChamadoService;
import com.labware.api.model.entity.Chamado;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/chamados")
@RequiredArgsConstructor
public class ChamadoController {

    private final ChamadoService chamadoService;

    //Listar todos os chamados
    @GetMapping
    public ResponseEntity<List<ChamadoResponse>> listartodos(){
        return ResponseEntity.ok(
                chamadoService.listarTodos()
        );
    }

    // Buscar chamado pelo ID
    @GetMapping("/{id}")
    public ResponseEntity<ChamadoResponse> buscarPorId(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                chamadoService.buscarPorId(id)
        );
    }

    // Criar Chamado
    @PostMapping
    public  ResponseEntity<ChamadoResponse> abrirChamado(
            @Valid @RequestBody AbrirChamadoRequest request){

        ChamadoResponse response =
                chamadoService.abrirChamado(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }


    //Atualizar chamado
    @PutMapping("/{id}")
    public ResponseEntity<ChamadoResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody AbrirChamadoRequest request) {

        return ResponseEntity.ok(
                chamadoService.atualizar(id, request)
        );
    }



}
