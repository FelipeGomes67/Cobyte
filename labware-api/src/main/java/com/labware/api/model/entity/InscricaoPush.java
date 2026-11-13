package com.labware.api.model.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Getter @Setter @NoArgsConstructor
@Table(name="inscricao_push")
public class InscricaoPush {
 @Id @Column(length=64) private String id;
 @Column(nullable=false) private Long usuarioId;
 @Column(nullable=false,length=2048) private String endpoint;
 @Column(nullable=false,length=128) private String p256dh;
 @Column(nullable=false,length=64) private String auth;
}
