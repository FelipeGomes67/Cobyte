package com.labware.api.service;

import com.labware.api.dto.response.UsuarioResponse;
import com.labware.api.exception.ResourceNotFoundException;
import com.labware.api.model.enums.PerfilUsuario;
import com.labware.api.repository.EmpresaRepository;
import com.labware.api.repository.UsuarioRepository;
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
