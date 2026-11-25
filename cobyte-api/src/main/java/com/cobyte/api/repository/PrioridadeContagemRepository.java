package com.cobyte.api.repository;

import com.cobyte.api.model.enums.Prioridade;

public interface PrioridadeContagemRepository {
    Prioridade getPrioridade();
    long getQuantidade();
}
