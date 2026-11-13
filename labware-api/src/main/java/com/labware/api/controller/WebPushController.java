package com.labware.api.controller;
import com.labware.api.config.UsuarioLogado;
import com.labware.api.service.WebPushService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.Map;
@RestController @RequestMapping("/api/push") @RequiredArgsConstructor
public class WebPushController {
 private final WebPushService service;
 public record Inscricao(@NotBlank @Size(max=2048) String endpoint,@NotBlank @Size(max=128) String p256dh,@NotBlank @Size(max=64) String auth) {}
 public record Remocao(@NotBlank @Size(max=2048) String endpoint) {}
 @GetMapping("/config") public Map<String,Object> config() { return Map.of("habilitado",service.habilitado(),"publicKey",service.chavePublica()); }
 @PostMapping("/inscricoes") public void registrar(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Inscricao r) { service.registrar(UsuarioLogado.id(jwt),r.endpoint(),r.p256dh(),r.auth()); }
 @PostMapping("/remover") public void remover(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Remocao r) { service.remover(UsuarioLogado.id(jwt),r.endpoint()); }
}
