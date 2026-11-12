package com.labware.api.dto.response;

import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.PerfilUsuario;

public record UsuarioResponse(Long id, String nome, String email, PerfilUsuario perfil,
                              Long empresaId, String empresaNome, String empresaInformada) {
    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPerfil(),
                usuario.getEmpresa() == null ? null : usuario.getEmpresa().getId(),
                usuario.getEmpresa() == null ? null : usuario.getEmpresa().getNome(), usuario.getEmpresaInformada());
    }
}
