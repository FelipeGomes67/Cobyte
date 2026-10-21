package com.labware.api.model.entity;
import com.labware.api.model.enums.Prioridade;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "politica_sla")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoliticaSla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 20)
    private Prioridade prioridade;

    @Column(nullable = false)
    private int minutosPrimeiraResposta;

    @Column(nullable = false)
    private int minutosResolucao;
}
