package com.labware.api.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Dados editáveis do perfil. A vinculação de empresa é exclusiva do suporte.")
public record AtualizarPerfilRequest(
        @Schema(description = "Nome do usuário.", example = "Maria Silva")
        @NotBlank @Size(max=255) String nome,
        @Schema(description = "E-mail do usuário, único sem distinção de caixa.", example = "maria@exemplo.com")
        @NotBlank @Email @Size(max=255) String email,
        @Schema(description = "Cargo informado no perfil; opcional.", example = "Analista")
        @Size(max=80) String cargo,
        @Schema(description = "Não enviar. A empresa é informada no cadastro e vinculada pelo suporte.", example = "Laboratório Exemplo")
        @Null(message = "Empresa deve ser vinculada pelo suporte") String empresa,
        @Schema(description = "Telefone de contato; opcional.", example = "(11) 98765-4321")
        @Size(max=20) String telefone,
        @Schema(description = "Não enviar. Use os endpoints de upload ou remoção de foto.", deprecated = true)
        @Null(message = "Use os endpoints de upload ou remoção para alterar a foto") String fotoPerfil,
        @Schema(description = "Não enviar. Vinculação exclusiva do suporte.")
        @Null(message = "Empresa deve ser vinculada pelo suporte") Long empresaId
) {
    public AtualizarPerfilRequest(String nome, String email, String cargo, String empresa, String telefone, String fotoPerfil) {
        this(nome, email, cargo, empresa, telefone, fotoPerfil, null);
    }

    public AtualizarPerfilRequest(String nome, String email, String cargo, String empresa) {
        this(nome, email, cargo, empresa, null, null, null);
    }
}
