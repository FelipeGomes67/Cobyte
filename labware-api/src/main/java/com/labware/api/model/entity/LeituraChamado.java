package com.labware.api.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.io.Serializable;

/** Mapeia a tabela usada pelo JdbcTemplate para os marcadores de leitura individuais. */
@Entity
@Table(name = "leitura_chamado")
@Getter @Setter @NoArgsConstructor
public class LeituraChamado {
    @EmbeddedId
    private Id id;

    @MapsId("usuarioId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @MapsId("chamadoId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false)
    private Chamado chamado;

    @Column(name = "ultima_mensagem_id", nullable = false)
    @ColumnDefault("0")
    private Long ultimaMensagemId = 0L;

    @Embeddable
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
    public static class Id implements Serializable {
        private static final long serialVersionUID = 1L;

        @Column(name = "usuario_id", nullable = false)
        private Long usuarioId;

        @Column(name = "chamado_id", nullable = false)
        private Long chamadoId;
    }
}
