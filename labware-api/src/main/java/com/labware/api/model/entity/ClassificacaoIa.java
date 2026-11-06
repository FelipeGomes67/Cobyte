package com.labware.api.model.entity;

import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "classificacao_ia")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClassificacaoIa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, unique = true)
    private Chamado chamado;

    // O que a IA sugeriu
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private CategoriaChamado categoriaSugerida;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Prioridade prioridadeSugerida;

    @Column(columnDefinition = "TEXT")
    private String justificativa;

    @Column(length = 50)
    private String modelo;

    @Column(length = 255)
    private String tituloGeradoIa;

    @Column(columnDefinition = "TEXT")
    private String sintomaObservadoIa;
    @Column(columnDefinition = "TEXT")
    private String impactoOperacionalIa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_sugerido_id")
    private Usuario tecnicoSugerido;

    private Integer slaMetaMinutos;

    // Decisão final do analista (permite medir a taxa de acerto da IA)
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private CategoriaChamado categoriaFinal;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Prioridade prioridadeFinal;

    @Column(nullable = false)
    private LocalDateTime classificadaEm;

    @PrePersist
    void aoCriar() {
        if (this.classificadaEm == null) this.classificadaEm = LocalDateTime.now();
    }
}