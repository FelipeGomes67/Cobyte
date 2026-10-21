package com.labware.api.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "avaliacao")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Avaliacao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull @Min(1) @Max(5)
    @Column(nullable = false)
    private Integer notaAvaliacao;

    @Size(max = 500)
    @Column(length = 500)
    private String comentarioAvaliacao;

    @Column(nullable = false, updatable = false)
    private LocalDateTime avaliadoEm;

    @PrePersist
    void aoCriar() {
        if (avaliadoEm == null) avaliadoEm = LocalDateTime.now();
    }
}
