package com.labware.api.dto.response;


import com.labware.api.model.enums.CategoriaChamado;
import com.labware.api.model.enums.OrigemChamado;
import com.labware.api.model.enums.Prioridade;
import com.labware.api.model.enums.StatusChamado;
import lombok.Getter;
import lombok.Setter;

import lombok.Builder;


import java.time.LocalDateTime;

@Builder
@Getter
@Setter
public class ChamadoResponse {

    private Long id;
    private String protocolo;
    private String titulo;
    private String descricao;

    private StatusChamado status;
    private Prioridade prioridade;
    private CategoriaChamado categoria;
    private OrigemChamado origem;

    private Long empresaId;
    private Long solicitanteId;
    private Long responsavelId;

    private LocalDateTime abertoEm;
    private LocalDateTime primeiraRespostaEm;
    private LocalDateTime resolvidoEm;

    private LocalDateTime prazoPrimeiraResposta;
    private LocalDateTime prazoResolucao;


}