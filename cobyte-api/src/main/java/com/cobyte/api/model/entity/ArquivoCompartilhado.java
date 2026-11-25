package com.cobyte.api.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "arquivo_compartilhado")
@Getter @Setter @NoArgsConstructor
public class ArquivoCompartilhado {
    @Id @Column(length = 180)
    private String chave;
    // bytea, não Large Object/OID: acesso normal pelo driver PostgreSQL e Neon.
    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] conteudo;
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();
}
