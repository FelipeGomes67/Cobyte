package com.labware.api.repository;

public interface MetricasResumoRepository {
    long getTotal();
    long getAbertos();
    long getEmAnalise();
    long getEmAtendimento();
    long getAguardandoCliente();
    long getResolvidos();
    long getFechados();
    long getResolvidosForaDoPrazo();
    long getIncidentesCriticos();
    long getSlasEmRisco();
}
