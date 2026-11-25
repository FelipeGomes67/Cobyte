package com.cobyte.api.controller;

import com.cobyte.api.service.*;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController @RequestMapping("/api/armazenamento") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ArmazenamentoController {
    private final MigracaoArquivosService migracao;
    private final ArquivosCompartilhadosService arquivos;
    @PostMapping("/migrar-local")
    public MigracaoArquivosService.Resultado migrar(
            @RequestParam(defaultValue="0") @Min(0) long aposAnexo,
            @RequestParam(defaultValue="0") @Min(0) long aposUsuario) {
        if (!arquivos.habilitado()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Ative UPLOADS_ARMAZENAMENTO=banco");
        return migracao.migrar(aposAnexo, aposUsuario);
    }
}
