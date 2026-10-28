package com.labware.api.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.PerfilUsuario;

@Schema(description = "Perfil público do usuário autenticado; não contém senha nem hash.")
public record PerfilResponse(
        @Schema(description = "Identificador do recurso.", example = "108")
        Long id,
        @Schema(description = "Nome do usuário.", example = "Maria Silva")
        String nome,
        @Schema(description = "E-mail do usuário, único sem distinção de caixa.", example = "maria@exemplo.com")
        String email,
        @Schema(description = "Cargo informado no perfil; opcional.", example = "Analista")
        String cargo,
        @Schema(description = "Nome da empresa cadastrada vinculada ao usuário.", example = "Laboratório Exemplo")
        String empresa,
        @Schema(description = "Identificador do vínculo cadastral com a empresa.", example = "1")
        Long empresaId,
        @Schema(description = "Perfil de acesso: CLIENTE, SUPORTE ou ADMIN.", example = "CLIENTE")
        PerfilUsuario perfil,
        @Schema(description = "Telefone para contato; opcional.", example = "(11) 98765-4321")
        String telefone,
        @Schema(description = "Foto ou avatar de perfil; opcional.")
        String fotoPerfil
) {
    public PerfilResponse(Long id, String nome, String email, String cargo, String empresa, Long empresaId, PerfilUsuario perfil) {
        this(id, nome, email, cargo, empresa, empresaId, perfil, null, null);
    }

    public static PerfilResponse from(Usuario u) {
        return new PerfilResponse(
                u.getId(),
                u.getNome(),
                u.getEmail(),
                u.getCargo(),
                u.getEmpresa() != null ? u.getEmpresa().getNome() : null,
                u.getEmpresa() != null ? u.getEmpresa().getId() : null,
                u.getPerfil(),
                u.getTelefone(),
                u.getFotoPerfil()
        );
    }
}
