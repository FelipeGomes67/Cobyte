package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.PerfilUsuario;

@Schema(description = "Resumo seguro do usuário autenticado.")
public record UsuarioResumoResponse(
        @Schema(description = "Identificador do recurso.", example = "108")
        Long id,
        @Schema(description = "Nome do usuário.", example = "Maria Silva")
        String nome,
        @Schema(description = "E-mail do usuário, único sem distinção de caixa.", example = "maria@exemplo.com")
        String email,
        @Schema(description = "Perfil de acesso: CLIENTE, SUPORTE ou ADMIN.", example = "CLIENTE")
        PerfilUsuario perfil,
        @Schema(description = "Nome da empresa cadastrada vinculada ao usuário.", example = "Laboratório Exemplo")
        String empresa
) {

    public static UsuarioResumoResponse from(Usuario u) {
        return new UsuarioResumoResponse(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(),
                u.getEmpresa() != null ? u.getEmpresa().getNome() : null);
    }
}
