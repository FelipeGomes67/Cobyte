package com.cobyte.api.controller;

import com.cobyte.api.dto.request.AprovarUsuarioRequest;
import com.cobyte.api.dto.response.UsuarioResponse;
import com.cobyte.api.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPORTE','ADMIN')")
public class UsuarioController {
    private final UsuarioService service;
    private final com.cobyte.api.repository.ChamadoRepository chamados;

    @GetMapping("/me/avaliacoes")
    public com.cobyte.api.dto.response.ResumoAvaliacoesResponse minhasAvaliacoes(
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt) {
        return chamados.resumirAvaliacoes(com.cobyte.api.config.UsuarioLogado.id(jwt));
    }


    @GetMapping("/pendentes")
    public List<UsuarioResponse> pendentes() { return service.pendentes(); }

    @PatchMapping("/{id}/aprovar")
    public UsuarioResponse aprovar(@PathVariable Long id, @Valid @RequestBody AprovarUsuarioRequest request) {
        return service.aprovar(id, request.empresaId());
    }
}
