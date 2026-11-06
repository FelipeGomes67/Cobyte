package com.labware.api.service;

import com.labware.api.dto.request.LoginRequest;
import com.labware.api.dto.response.LoginResponse;
import com.labware.api.dto.response.UsuarioResumoResponse;
import com.labware.api.model.entity.Usuario;
import com.labware.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        // Mesma mensagem para e-mail inexistente e senha errada
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> passwordEncoder.matches(req.senha(), u.getSenhaHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "E-mail ou senha inválidos"));

        TokenService.TokenGerado token = tokenService.gerar(usuario);
        return new LoginResponse(token.valor(), "Bearer", token.expiraEm(), UsuarioResumoResponse.from(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResumoResponse me(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .map(UsuarioResumoResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário inválido"));
    }
}
