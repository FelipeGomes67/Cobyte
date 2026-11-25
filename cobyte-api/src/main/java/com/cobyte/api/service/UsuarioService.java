package com.cobyte.api.service;

import com.cobyte.api.dto.response.UsuarioResponse;
import com.cobyte.api.exception.ResourceNotFoundException;
import com.cobyte.api.model.enums.PerfilUsuario;
import com.cobyte.api.repository.EmpresaRepository;
import com.cobyte.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UsuarioService {
    private final UsuarioRepository usuarios;
    private final EmpresaRepository empresas;
    private final NotificacaoService notificacoes;

    @Transactional
    public UsuarioResponse atualizarAdministracao(Long id, Long administradorId,
            com.cobyte.api.dto.request.AtualizarUsuarioAdminRequest request) {
        var usuario = usuarios.buscarParaAprovacao(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        if (id.equals(administradorId) && request.perfil() != PerfilUsuario.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Você não pode remover seu próprio acesso de administrador");
        }
        if (request.perfil() != PerfilUsuario.CLIENTE && request.empresaId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas clientes possuem empresa vinculada");
        }
        com.cobyte.api.model.entity.Empresa empresa = null;
        if (request.empresaId() != null) {
            empresa = empresas.findById(request.empresaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
            if (!empresa.isAtiva()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa inativa");
            }
        }
        if (usuario.getPerfil() != request.perfil()) usuario.revogarSessoes();
        usuario.setPerfil(request.perfil());
        usuario.setEmpresa(empresa);
        return UsuarioResponse.from(usuarios.save(usuario));
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> pendentes() {
        return usuarios.findByPerfilAndEmpresaIsNullOrderByIdDesc(PerfilUsuario.CLIENTE)
                .stream().map(UsuarioResponse::from).toList();
    }

    @Transactional
    public UsuarioResponse aprovar(Long id, Long empresaId) {
        var usuario = usuarios.buscarParaAprovacao(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        if (usuario.getPerfil() != PerfilUsuario.CLIENTE || usuario.getEmpresa() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Usuário não está pendente de vinculação");
        }
        var empresa = empresas.findById(empresaId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        if (!empresa.isAtiva()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa inativa");
        }
        usuario.setEmpresa(empresa);
        var salvo = usuarios.save(usuario);
        notificacoes.emitirAprovacaoCadastro(salvo, empresa.getNome());
        return UsuarioResponse.from(salvo);
    }
}
