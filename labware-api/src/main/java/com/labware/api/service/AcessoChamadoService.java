package com.labware.api.service;

import com.labware.api.model.entity.Chamado;
import com.labware.api.model.entity.Usuario;
import com.labware.api.model.enums.PerfilUsuario;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AcessoChamadoService {

    public boolean ehSuporte(Usuario usuario) {
        return usuario != null && (usuario.getPerfil() == PerfilUsuario.SUPORTE || usuario.getPerfil() == PerfilUsuario.ADMIN);
    }

    /** SUPORTE e ADMIN acessam qualquer chamado; CLIENTE somente os que abriu. */
    public void exigirEmpresaVinculada(Usuario usuario) {
        if (usuario != null && usuario.getPerfil() == PerfilUsuario.CLIENTE && usuario.getEmpresa() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Vinculação de empresa pendente. Aguarde a aprovação pelo suporte.");
        }
    }

    public void exigir(Chamado chamado, Usuario usuario) {
        exigirEmpresaVinculada(usuario);
        if (ehSuporte(usuario)) return;

        if (usuario != null && usuario.getPerfil() == PerfilUsuario.CLIENTE
                && chamado != null && chamado.getSolicitante() != null
                && chamado.getSolicitante().getId().equals(usuario.getId())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este chamado");
    }
}
