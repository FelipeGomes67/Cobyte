package com.cobyte.api.service;

import com.cobyte.api.model.entity.Chamado;
import com.cobyte.api.model.entity.Usuario;
import com.cobyte.api.model.enums.PerfilUsuario;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AcessoChamadoService {

    public boolean ehSuporte(Usuario usuario) {
        return usuario != null && (usuario.getPerfil() == PerfilUsuario.SUPORTE || usuario.getPerfil() == PerfilUsuario.ADMIN);
    }

    /** Clientes sem empresa ainda aguardam a aprovação do vínculo. */
    public void exigirEmpresaVinculada(Usuario usuario) {
        if (usuario != null && usuario.getPerfil() == PerfilUsuario.CLIENTE && usuario.getEmpresa() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Vinculação de empresa pendente. Aguarde a aprovação pelo suporte.");
        }
    }

    public void exigirLeitura(Chamado chamado, Usuario usuario) {
        exigirEmpresaVinculada(usuario);
        if (ehSuporte(usuario)) return;
        if (!mesmaEmpresa(chamado, usuario)) negar();
    }

    public void exigirSolicitante(Chamado chamado, Usuario usuario) {
        if (!mesmaEmpresa(chamado, usuario) || chamado.getSolicitante() == null
                || !chamado.getSolicitante().getId().equals(usuario.getId())) negar();
    }

    public void exigirEdicao(Chamado chamado, Usuario usuario) {
        if (ehSuporte(usuario)) {
            if (usuario.getPerfil() != PerfilUsuario.ADMIN && !chamado.possuiTecnico(usuario.getId())) negar();
        } else if (!mesmaEmpresa(chamado, usuario)) {
            negar();
        }
    }

    private boolean mesmaEmpresa(Chamado chamado, Usuario usuario) {
        return chamado != null && chamado.getEmpresa() != null && usuario != null
                && usuario.getPerfil() == PerfilUsuario.CLIENTE && usuario.getEmpresa() != null
                && usuario.getEmpresa().getId().equals(chamado.getEmpresa().getId());
    }

    private void negar() {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este chamado");
    }
}
