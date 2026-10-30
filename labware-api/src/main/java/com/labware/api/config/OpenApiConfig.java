package com.labware.api.config;

import com.labware.api.exception.ErroResponse;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI labwareOpenApi() {
        Components components = new Components()
                .addSecuritySchemes("BearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                        .description("Faça login e cole somente o campo token no botão Authorize, sem o prefixo Bearer."));
        ModelConverters.getInstance().readAll(ErroResponse.class).forEach(components::addSchemas);
        components.addResponses("DadosInvalidos", erro("Parâmetros ou corpo inválidos."));
        components.addResponses("NaoAutenticado", erro("JWT ausente/inválido/expirado ou credenciais incorretas."));
        components.addResponses("AcessoNegado", erro("Perfil sem permissão ou chamado de outro solicitante."));
        components.addResponses("NaoEncontrado", erro("Recurso não encontrado."));
        components.addResponses("Conflito", erro("Estado incompatível, avaliação existente ou e-mail duplicado."));
        components.addResponses("ArquivoGrande", erro("Arquivo ultrapassa o limite de upload de 10 MB."));
        components.addResponses("TipoInvalido", erro("Formato de áudio não suportado."));
        components.addResponses("AudioInvalido", erro("Áudio inválido ou sem fala para salvar uma mensagem."));
        components.addResponses("ServicoIndisponivel", erro("IA/STT indisponível ou resposta inválida."));
        components.addResponses("ErroInterno", erro("Erro interno ao processar a solicitação."));
        return new OpenAPI().openapi("3.0.3")
                .info(new Info().title("LABWARE LIMS").version("1.0.0")
                        .description("Documentação dos endpoints REST para integração do Portal do Cliente, "
                                + "Painel do Suporte, Triagem por IA e Transcrição Local de Áudio (STT)."))
                .components(components)
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }

    private ApiResponse erro(String descricao) {
        return new ApiResponse().description(descricao).content(new Content()
                .addMediaType("application/json", new io.swagger.v3.oas.models.media.MediaType()
                        .schema(new Schema<>().$ref("#/components/schemas/ErroResponse"))));
    }
}
