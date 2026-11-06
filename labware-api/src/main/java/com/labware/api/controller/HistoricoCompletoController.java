package com.labware.api.controller;

import com.labware.api.config.UsuarioLogado;
import com.labware.api.dto.response.*;
import com.labware.api.service.HistoricoCompletoService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.constraints.*;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/chamados/historico")
public class HistoricoCompletoController {
    private final HistoricoCompletoService service;
    @GetMapping
    public PaginaResponse<ChamadoResponse> listar(@AuthenticationPrincipal Jwt jwt,
                                                  @RequestParam(required=false) @Size(max=255) String busca,
                                                  @RequestParam(defaultValue="0") @Min(0) int page,
                                                  @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return service.listar(UsuarioLogado.id(jwt),busca,page,size);
    }
    @GetMapping("/{id}")
    public HistoricoCompletoResponse buscar(@PathVariable Long id,@AuthenticationPrincipal Jwt jwt) {
        return service.buscar(id,UsuarioLogado.id(jwt));
    }
}
