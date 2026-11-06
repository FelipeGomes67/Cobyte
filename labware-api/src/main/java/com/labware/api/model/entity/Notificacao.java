package com.labware.api.model.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="notificacao") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Notificacao {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="usuario_id",nullable=false) private Usuario usuario;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="chamado_id") private Chamado chamado;
    @Column(nullable=false) private String titulo;
    @Column(nullable=false,columnDefinition="TEXT") private String mensagem;
    @Column(nullable=false,length=30) private String tipo;
    @Column(nullable=false) private boolean lida;
    @Column(nullable=false) private LocalDateTime criadoEm;
    @PrePersist void criar() { if(criadoEm==null) criadoEm=LocalDateTime.now(); }
}
