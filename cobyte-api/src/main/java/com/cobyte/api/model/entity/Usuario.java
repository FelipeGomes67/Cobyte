package com.cobyte.api.model.entity;

import com.cobyte.api.model.enums.PerfilUsuario;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "usuario")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "senha", nullable = false)
    private String senhaHash;

    @Column(name = "versao_sessao")
    private java.util.UUID versaoSessao;

    public String versaoSessaoAtual() {
        return versaoSessao == null ? "0" : versaoSessao.toString();
    }

    public void revogarSessoes() {
        versaoSessao = java.util.UUID.randomUUID();
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PerfilUsuario perfil;

    @Column(length = 80)
    private String cargo;

    @Column(name = "empresa_informada", length = 255)
    private String empresaInformada;


    @Column(name = "foto_perfil", length = 500)
    private String fotoPerfil;

    @Column(length = 20)
    private String telefone;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> preferenciasNotificacao = new HashMap<>();

    // Nulo para SUPORTE e ADMIN (funcionários da COBYTE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id")
    private Empresa empresa;

}
