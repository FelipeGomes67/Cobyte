package com.labware.api.model.enums;

public enum OrigemChamado {
    TEXTO, VOZ;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static OrigemChamado parse(String valor) {
        return switch(valor.toUpperCase(java.util.Locale.ROOT)) {
            case "PORTAL_TEXTO", "TEXTO" -> TEXTO;
            case "AUDIO_VOZ", "VOZ" -> VOZ;
            default -> throw new IllegalArgumentException("Origem inválida");
        };
    }
}
