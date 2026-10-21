package com.labware.api.model.entity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "historico")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HistoricoChamado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id")
    private Chamado chamado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    private String valorAnterior;
    private String valorNovo;

    @Column(nullable = false, updatable = false)
    private LocalDateTime alteradoEm;

    @PrePersist
    void aoCriar() {
        if (this.alteradoEm == null) this.alteradoEm = LocalDateTime.now();
    }
}
