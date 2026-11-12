package com.labware.api.controller;

import com.labware.api.dto.request.AprovarUsuarioRequest;
import com.labware.api.dto.response.UsuarioResponse;
import com.labware.api.service.UsuarioService;
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

    @GetMapping("/pendentes")
    public List<UsuarioResponse> pendentes() { return service.pendentes(); }

    @PatchMapping("/{id}/aprovar")
    public UsuarioResponse aprovar(@PathVariable Long id, @Valid @RequestBody AprovarUsuarioRequest request) {
        return service.aprovar(id, request.empresaId());
    }
}
