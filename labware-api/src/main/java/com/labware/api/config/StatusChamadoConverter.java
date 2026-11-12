package com.labware.api.config;

import com.labware.api.model.enums.StatusChamado;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class StatusChamadoConverter implements Converter<String, StatusChamado> {
    @Override public StatusChamado convert(String valor) { return StatusChamado.deCodigo(valor); }
}
