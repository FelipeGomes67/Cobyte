package com.labware.api.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "empresa")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true, length = 18)
    private String cnpj;

    @Builder.Default
    @Column(nullable = false)
    private boolean ativa = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadaEm;

    @PrePersist
    void aoCriar() {
        this.criadaEm = LocalDateTime.now();
    }
}
