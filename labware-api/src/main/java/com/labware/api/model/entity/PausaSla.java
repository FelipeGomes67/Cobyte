package com.labware.api.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pausa_sla")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PausaSla {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false)
    private Chamado chamado;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String motivo;

    @Column(nullable = false, updatable = false)
    private LocalDateTime inicio;

    private LocalDateTime fim;

    @PrePersist
    void aoCriar() {
        if (inicio == null) inicio = LocalDateTime.now();
    }
}
