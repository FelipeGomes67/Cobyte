package com.cobyte.api.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "recuperacao_senha")
@Getter @Setter @NoArgsConstructor
public class RecuperacaoSenha {
    @Id @Column(length = 64)
    private String hash;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;
    @Column(nullable = false)
    private Instant expiraEm;
    @Column(nullable = false, length = 36)
    private String versaoSessao;
    @Column(nullable = false)
    private String email;
    @org.hibernate.annotations.ColumnDefault("0")
    @Column(nullable = false)
    private int tentativas;
}
