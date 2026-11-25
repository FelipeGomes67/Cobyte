package com.cobyte.api.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final RestSecurityHandlers handlers;
    private final com.cobyte.api.repository.UsuarioRepository usuarios;
    private final com.cobyte.api.service.LimiteRequisicoes limites;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .addFilterAfter(new FiltroLimiteRequisicoes(limites),
                        org.springframework.security.web.access.intercept.AuthorizationFilter.class)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // "/error" deve permanecer liberado
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/swagger-ui.html", "/swagger-ui/**",
                                "/api-docs", "/api-docs.yaml", "/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/cadastrar").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/*/foto").permitAll()
                        // Quarentena permite somente consultar/editar a própria conta.
                        .requestMatchers("/api/auth/me", "/api/usuarios/me", "/api/usuarios/me/senha",
                                "/api/usuarios/me/foto", "/api/usuarios/alterar-senha").authenticated()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/dashboard/**", "/api/relatorios/**", "/api/metricas/**").hasAnyRole("SUPORTE", "ADMIN")
                        // endpoints antigos de laboratório
                        .requestMatchers("/api/ai/**").hasRole("ADMIN")
                        .requestMatchers("/api/chamados/metricas/**").hasAnyRole("SUPORTE", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/chamados").hasRole("CLIENTE")
                        .requestMatchers(HttpMethod.PATCH,
                                "/api/chamados/*/assumir")
                        .hasAnyRole("SUPORTE", "ADMIN")
                        .anyRequest().hasAnyRole("CLIENTE", "SUPORTE", "ADMIN")
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(handlers)
                        .accessDeniedHandler(handlers)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(handlers)
                        .accessDeniedHandler(handlers)
                );

        return http.build();
    }

    /** Consulta o perfil atual para que alterações administrativas revoguem privilégios antigos. */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Long id;
            try { id = UsuarioLogado.id(jwt); }
            catch (RuntimeException e) {
                throw new org.springframework.security.oauth2.server.resource.InvalidBearerTokenException("Usuário inválido");
            }
            var usuario = usuarios.findById(id).orElseThrow(() ->
                    new org.springframework.security.oauth2.server.resource.InvalidBearerTokenException("Usuário não encontrado"));
            if (!usuario.versaoSessaoAtual().equals(jwt.getClaimAsString("versaoSessao"))) {
                throw new org.springframework.security.oauth2.server.resource.InvalidBearerTokenException("Sessão revogada");
            }
            boolean pendente = usuario.getPerfil() == com.cobyte.api.model.enums.PerfilUsuario.CLIENTE
                    && usuario.getEmpresa() == null;
            return List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                    "ROLE_" + (pendente ? "PENDENTE" : usuario.getPerfil().name())));
        });
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cobyte.cors.origens}") List<String> origens) {
        CorsConfiguration config = new CorsConfiguration();
        var origensConfiguradas = origens.stream().map(String::trim).filter(origem -> !origem.isEmpty()).toList();
        for (String origem : origensConfiguradas) {
            java.net.URI uri;
            try { uri = java.net.URI.create(origem); }
            catch (IllegalArgumentException erro) { throw new IllegalArgumentException("Origem CORS inválida"); }
            if (origem.contains("*") || !List.of("http", "https").contains(uri.getScheme())
                    || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null
                    || uri.getFragment() != null || (uri.getPath() != null && !uri.getPath().isEmpty())) {
                throw new IllegalArgumentException("CORS exige origens HTTP/HTTPS exatas, sem caminhos ou curingas");
            }
        }
        config.setAllowedOriginPatterns(origensConfiguradas);
        config.setAllowCredentials(true);
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "ngrok-skip-browser-warning"));
        config.setExposedHeaders(List.of("Retry-After"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
