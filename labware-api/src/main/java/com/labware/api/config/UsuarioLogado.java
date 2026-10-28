package com.labware.api.config;

import org.springframework.security.oauth2.jwt.Jwt;

public final class UsuarioLogado {

    private UsuarioLogado() {}

    /** O subject do token é o id do usuário. */
    public static Long id(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}