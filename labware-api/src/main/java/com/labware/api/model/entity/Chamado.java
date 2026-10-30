package com.labware.api.model.entity;
import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.Prioridade;
import com.labware.api.model.enums.StatusChamado;
import com.labware.api.model.enums.OrigemChamado;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chamado")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Chamado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String protocolo;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descricao;
    private Double duracaoAudioSegundos;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusChamado status = StatusChamado.ABERTO;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Prioridade prioridade;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private CategoriaChamado categoria;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "empresa_id")
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitante_id")
    private Usuario solicitante;

    // Nulo até o chamado ser atribuído a alguém do suporte
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;

    @Column(nullable = false, updatable = false)
    private LocalDateTime abertoEm;

    private LocalDateTime primeiraRespostaEm;
    private LocalDateTime resolvidoEm;

    // Calculados na abertura com base na PoliticaSla da prioridade
    private LocalDateTime prazoPrimeiraResposta;
    private LocalDateTime prazoResolucao;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrigemChamado origem = OrigemChamado.TEXTO;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "avaliacao_id", unique = true)
    private Avaliacao avaliacao;

    @Builder.Default
    @OneToMany(mappedBy = "chamado")
    @OrderBy("alteradoEm ASC, id ASC")
    private List<HistoricoChamado> historicos = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "chamado")
    @OrderBy("inicio ASC, id ASC")
    private List<PausaSla> pausasSla = new ArrayList<>();

    @PrePersist
    void aoCriar() {
        if (this.abertoEm == null) {
            this.abertoEm = LocalDateTime.now();
        }
    }
}
