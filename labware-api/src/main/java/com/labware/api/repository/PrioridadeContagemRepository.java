package com.labware.api.repository;

import com.labware.api.model.enums.Prioridade;

public interface PrioridadeContagemRepository {
    Prioridade getPrioridade();
    long getQuantidade();
}
