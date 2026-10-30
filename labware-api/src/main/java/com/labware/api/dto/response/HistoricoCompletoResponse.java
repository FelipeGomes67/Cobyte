package com.labware.api.dto.response;

import java.util.List;

/** Um registro por chamado: avaliação e classificação final estão em chamado. */
public record HistoricoCompletoResponse(ChamadoResponse chamado, List<MensagemResponse> mensagens,
        List<AnexoResponse> anexos, TriagemResponse classificacaoIa) {}
