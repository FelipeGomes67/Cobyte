package com.cobyte.api.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class TipoArquivoPermitido {
    private TipoArquivoPermitido() {}

    static String identificar(String nome, byte[] cabecalho, boolean somenteAudio) {
        String extensao = nome.substring(nome.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String tipo = switch (extensao) {
            case "wav" -> texto(cabecalho, 0, "RIFF") && texto(cabecalho, 8, "WAVE") ? "audio/wav" : null;
            case "ogg" -> texto(cabecalho, 0, "OggS") ? "audio/ogg" : null;
            case "flac" -> texto(cabecalho, 0, "fLaC") ? "audio/flac" : null;
            case "m4a" -> texto(cabecalho, 4, "ftyp") ? "audio/mp4" : null;
            case "mp3" -> texto(cabecalho, 0, "ID3") || (cabecalho.length >= 4
                    && (cabecalho[0] & 255) == 255 && (cabecalho[1] & 230) == 226) ? "audio/mpeg" : null;
            case "png" -> cabecalho.length >= 8 && (cabecalho[0] & 255) == 137
                    && texto(cabecalho, 1, "PNG\r\n\u001a\n") ? "image/png" : null;
            case "jpeg", "jpg" -> cabecalho.length >= 3 && (cabecalho[0] & 255) == 255
                    && (cabecalho[1] & 255) == 216 && (cabecalho[2] & 255) == 255 ? "image/jpeg" : null;
            case "gif" -> texto(cabecalho, 0, "GIF89a") || texto(cabecalho, 0, "GIF87a") ? "image/gif" : null;
            case "webp" -> texto(cabecalho, 0, "RIFF") && texto(cabecalho, 8, "WEBP") ? "image/webp" : null;
            case "pdf" -> texto(cabecalho, 0, "%PDF-") ? "application/pdf" : null;
            default -> null;
        };
        if (tipo == null || (somenteAudio && !tipo.startsWith("audio/"))) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Formato de arquivo não permitido ou conteúdo incompatível com a extensão");
        }
        return tipo;
    }

    private static boolean texto(byte[] dados, int inicio, String assinatura) {
        if (dados.length < inicio + assinatura.length()) return false;
        return assinatura.equals(new String(dados, inicio, assinatura.length(), StandardCharsets.US_ASCII));
    }
}
