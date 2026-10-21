package com.labware.api.model.entity;
import com.labware.api.model.enums.TipoMensagem;
import jakarta.persistence.*;
import lombok.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

@Entity
@Table(name = "mensagens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Mensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id")
    private Chamado chamado;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoMensagem tipo = TipoMensagem.TEXTO;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String conteudo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "anexo_id")
    private Anexo anexo;

    @Builder.Default
    @Column(nullable = false)
    private boolean visivelApenasSuporte = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void aoCriar() {
        if (this.criadoEm == null) this.criadoEm = LocalDateTime.now();
    }
}
