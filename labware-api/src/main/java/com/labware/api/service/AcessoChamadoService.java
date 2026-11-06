package com.labware.api.service;

import com.labware.api.model.entity.Chamado;
import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.PerfilUsuario;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class AcessoChamadoService {

    public boolean ehSuporte(Usuario usuario) {
        return usuario.getPerfil() == PerfilUsuario.SUPORTE || usuario.getPerfil() == PerfilUsuario.ADMIN;
    }

    /** SUPORTE e ADMIN acessam qualquer chamado; CLIENTE somente os que abriu. */
    public void exigir(Chamado chamado, Usuario usuario) {
        if (ehSuporte(usuario)) return;

        if (usuario.getPerfil() == PerfilUsuario.CLIENTE
                && chamado.getSolicitante().getId().equals(usuario.getId())) {
            return;
        }
        throw new AccessDeniedException("Sem acesso a este chamado");
    }
}
