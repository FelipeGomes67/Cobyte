package com.labware.api.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "email_pendente", indexes = @Index(name = "idx_email_pendente_envio", columnList = "estado,proxima_tentativa,id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmailPendente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String destinatario;
    @Column(nullable = false)
    private String titulo;
    @Column(nullable = false, columnDefinition = "text")
    private String texto;
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.PENDENTE;
    @Builder.Default
    @Column(nullable = false)
    private int tentativas = 0;
    @Builder.Default
    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm = Instant.now();
    @Builder.Default
    @Column(name = "proxima_tentativa", nullable = false)
    private Instant proximaTentativa = Instant.now();
    @Column(name = "enviado_em")
    private Instant enviadoEm;
    @Column(name = "ultimo_erro", length = 255)
    private String ultimoErro;

    public enum Estado { PENDENTE, ENVIADO, FALHOU }
}
