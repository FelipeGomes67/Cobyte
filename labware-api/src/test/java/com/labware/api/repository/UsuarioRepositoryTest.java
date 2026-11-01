package com.labware.api.repository;

import com.labware.api.model.entity.*;
import com.labware.api.model.enums.PerfilUsuario;
import com.labware.api.support.JpaTestConfig;
import jakarta.persistence.*;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringJUnitConfig(JpaTestConfig.class)
@Transactional
class UsuarioRepositoryTest {
    @Autowired UsuarioRepository usuarios;
    @PersistenceContext EntityManager em;
    @Autowired EntityManagerFactory factory;

    @Test void paginaCarregaEmpresasSemConsultasAdicionaisEMantemClientesSemEmpresa() {
        for (int i = 0; i < 3; i++) {
            var empresa = Empresa.builder().nome("Empresa " + i).cnpj("0000000000000" + i).build();
            em.persist(empresa);
            em.persist(Usuario.builder().nome("Cliente " + i).email("cliente" + i + "@teste.com")
                    .senhaHash("hash").perfil(PerfilUsuario.CLIENTE).empresa(empresa).build());
        }
        em.persist(Usuario.builder().nome("Cliente sem empresa").email("sem@teste.com")
                .senhaHash("hash").perfil(PerfilUsuario.CLIENTE).build());
        em.flush();
        em.clear();
        var stats = factory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        var pagina = usuarios.listarClientes("Cliente", PageRequest.of(0, 2));
        assertEquals(4, pagina.getTotalElements());
        assertEquals(2, pagina.getContent().size());
        long consultas = stats.getPrepareStatementCount();
        pagina.forEach(u -> assertNotNull(u.getEmpresa().getNome()));
        assertEquals(consultas, stats.getPrepareStatementCount());
        assertEquals(2, consultas); // Uma consulta para a página e outra para a contagem.
        var semEmpresa = usuarios.listarClientes("sem@teste.com", PageRequest.of(0, 2));
        assertEquals(1, semEmpresa.getTotalElements());
        assertNull(semEmpresa.getContent().get(0).getEmpresa());
    }
}
