package com.cobyte.api.controller;

import com.cobyte.api.service.LimiteRequisicoes;
import com.cobyte.api.service.RecuperacaoSenhaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Locale;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class RecuperacaoSenhaController {
    private final RecuperacaoSenhaService recuperacao;
    private final ApplicationEventPublisher eventos;
    private final LimiteRequisicoes limites;
    public record Solicitar(@NotBlank @Email @Size(max = 255) String email) { }
    public record Validar(@NotBlank @Email @Size(max = 255) String email,
                          @NotBlank @Pattern(regexp = "[0-9]{6}") String codigo) { }
    public record Validacao(String autorizacao) { }
    public record Redefinir(@NotBlank @Email @Size(max = 255) String email,
                            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String autorizacao,
                            @NotBlank @Size(min = 8, max = 72) String novaSenha) { }
    public record Confirmacao(String mensagem) { }

    @PostMapping("/esqueci-senha") @ResponseStatus(HttpStatus.ACCEPTED)
    public Confirmacao solicitar(@Valid @RequestBody Solicitar request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        limites.consumir("recuperacao-conta:" + email, 3);
        eventos.publishEvent(new RecuperacaoSenhaService.Solicitacao(email));
        return new Confirmacao("Se houver uma conta com esse e-mail, voce recebera um codigo para redefinir sua senha.");
    }

    @PostMapping("/validar-codigo-recuperacao")
    public Validacao validar(@Valid @RequestBody Validar request) {
        String autorizacao = recuperacao.validarCodigo(request.email(), request.codigo());
        if (autorizacao == null) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Codigo invalido, expirado ou com limite de tentativas atingido. Solicite um novo codigo.");
        return new Validacao(autorizacao);
    }

    @PostMapping("/redefinir-senha") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinir(@Valid @RequestBody Redefinir request) {
        if (!recuperacao.redefinir(request.email(), request.autorizacao(), request.novaSenha())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Autorizacao invalida ou expirada. Solicite um novo codigo.");
        }
    }
}
