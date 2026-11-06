package com.labware.api.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "anexos")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Anexo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false)
    private Chamado chamado;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @NotBlank @Column(nullable = false)
    private String nomeArquivo;
    private String tipoConteudo;
    @NotBlank @Column(nullable = false, length = 1000)
    private String caminhoArquivo;
    @Column(nullable = false)
    private long tamanhoBytes;
    private Double duracaoAudioSegundos;
    @Column(nullable = false, updatable = false)
    private LocalDateTime enviadoEm;

    @PrePersist
    void aoCriar() {
        if (enviadoEm == null) enviadoEm = LocalDateTime.now();
    }
}
