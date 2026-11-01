package com.labware.api.service;

import com.labware.api.dto.request.AtualizarPerfilRequest;
import com.labware.api.model.entity.*;
import com.labware.api.model.enums.PerfilUsuario;
import com.labware.api.repository.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.Optional;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PerfilServiceTest {
    @TempDir Path fotos;
    UsuarioRepository usuarios;
    EmpresaRepository empresas;
    PerfilService service;
    Usuario usuario;

    @BeforeEach void preparar() {
        usuarios = mock(UsuarioRepository.class);
        empresas = mock(EmpresaRepository.class);
        service = new PerfilService(usuarios, mock(PasswordEncoder.class), empresas, fotos.toString());
        usuario = Usuario.builder().id(1L).nome("Cliente").email("cliente@teste.com")
                .perfil(PerfilUsuario.CLIENTE).build();
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario));
        when(usuarios.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test void empresaDigitadaNaoAlteraVinculoCadastral() {
        var empresa = Empresa.builder().id(10L).nome("Empresa cadastrada").build();
        usuario.setEmpresa(empresa);
        var resposta = service.atualizar(1L, new AtualizarPerfilRequest("Cliente", "cliente@teste.com", null, " Nova empresa "));
        assertEquals("Nova empresa", resposta.empresa());
        assertEquals(10L, resposta.empresaId());
        assertSame(empresa, usuario.getEmpresa());
        verifyNoInteractions(empresas);
        assertEquals("Nova empresa", service.buscar(1L).empresa());
    }

    @Test void empresaLivreSemCadastroNaoCriaVinculo() {
        var resposta = service.atualizar(1L, new AtualizarPerfilRequest("Cliente", "cliente@teste.com", null, "Empresa livre"));
        assertEquals("Empresa livre", resposta.empresa());
        assertNull(resposta.empresaId());
        verifyNoInteractions(empresas);
    }

}
