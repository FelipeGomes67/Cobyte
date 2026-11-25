package com.cobyte.api.controller;

import com.cobyte.api.dto.response.PaginaResponse;
import com.cobyte.api.dto.response.UsuarioResponse;
import com.cobyte.api.model.enums.PerfilUsuario;
import com.cobyte.api.repository.EmpresaRepository;
import com.cobyte.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Transactional(readOnly = true)
public class AdminController {
    private final UsuarioRepository usuarios;
    private final EmpresaRepository empresas;
    private final com.cobyte.api.service.UsuarioService usuarioService;

    @PatchMapping("/usuarios/{id}")
    @Transactional
    public UsuarioResponse atualizarUsuario(@PathVariable Long id,
            @jakarta.validation.Valid @RequestBody com.cobyte.api.dto.request.AtualizarUsuarioAdminRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt) {
        return usuarioService.atualizarAdministracao(id, com.cobyte.api.config.UsuarioLogado.id(jwt), request);
    }

    @GetMapping("/usuarios")
    public PaginaResponse<UsuarioResponse> usuarios(@RequestParam(defaultValue = "") String busca,
            @RequestParam(required = false) PerfilUsuario perfil, @RequestParam(defaultValue = "0") int page) {
        return PaginaResponse.from(usuarios.listarAdministracao(busca.trim(), perfil,
                PageRequest.of(Math.max(0, page), 20, Sort.by("id").descending())).map(UsuarioResponse::from));
    }

    public record EmpresaAdministracao(Long id, String nome, String cnpj, boolean ativa) {}

    @GetMapping("/empresas")
    public PaginaResponse<EmpresaAdministracao> empresas(@RequestParam(defaultValue = "0") int page) {
        return PaginaResponse.from(empresas.findAll(PageRequest.of(Math.max(0, page), 20, Sort.by("nome").ascending()))
                .map(e -> new EmpresaAdministracao(e.getId(), e.getNome(), e.getCnpj(), e.isAtiva())));
    }
}
