package com.labware.api.service;

import com.labware.api.dto.response.TranscricaoResponse;
import com.labware.api.exception.TranscricaoException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;

@Service
@Slf4j
public class TranscricaoService {
    private static final Set<String> EXTENSOES = Set.of("wav", "mp3", "ogg", "m4a", "flac");
    private final RestClient client;
    private final long maxBytes;

    @Autowired
    public TranscricaoService(@Value("${labware.stt.url}") String url,
                              @Value("${labware.stt.timeout-segundos:120}") int timeout,
                              @Value("${labware.uploads.tamanho-maximo-bytes:10485760}") long maxBytes) {
        if (timeout <= 0 || maxBytes <= 0 || maxBytes >= Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Limites STT inválidos");
        }
        var factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(java.net.HttpURLConnection connection, String method) throws IOException {
                super.prepareConnection(connection, method);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(timeout));
        this.client = RestClient.builder().baseUrl(url).requestFactory(factory).build();
        this.maxBytes = maxBytes;
    }

    TranscricaoService(RestClient client, long maxBytes) {
        this.client = client;
        this.maxBytes = maxBytes;
    }

    public TranscricaoResponse transcreverAudio(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) throw new TranscricaoException(400, "Áudio vazio ou ausente");
        if (arquivo.getSize() > maxBytes) throw new TranscricaoException(413, "Áudio excede o tamanho permitido");
        String nome = nomeSeguro(arquivo.getOriginalFilename());
        int ponto = nome.lastIndexOf('.');
        if (ponto < 0 || !EXTENSOES.contains(nome.substring(ponto + 1).toLowerCase(Locale.ROOT))) {
            throw new TranscricaoException(415, "Extensão de áudio não permitida");
        }
        try {
            byte[] bytes;
            try (var entrada = arquivo.getInputStream()) {
                bytes = entrada.readNBytes((int) Math.min(maxBytes + 1, Integer.MAX_VALUE));
            }
            if (bytes.length > maxBytes) throw new TranscricaoException(413, "Áudio excede o tamanho permitido");
            if (bytes.length == 0) throw new TranscricaoException(400, "Arquivo de áudio vazio");
            var recurso = new ByteArrayResource(bytes) {
                @Override public String getFilename() { return nome; }
            };
            var partes = new LinkedMultiValueMap<String, Object>();
            var headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            partes.add("arquivo", new HttpEntity<>(recurso, headers));
            log.info("Enviando áudio ao STT local: bytes={}", bytes.length);
            var resposta = client.post().uri("/transcrever").contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(partes).retrieve().body(TranscricaoResponse.class);
            validarResposta(resposta);
            log.info("Transcrição recebida: duracaoSegundos={}", resposta.duracaoSegundos());
            return resposta;
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            log.warn("STT respondeu com erro: status={}", status);
            if (status == 422 && ex.getResponseBodyAsString().contains("detectada fala")) {
                throw new TranscricaoException(422, "Não foi detectada fala no áudio. Grave novamente falando próximo ao microfone.");
            }
            if (Set.of(400, 413, 415, 422).contains(status)) {
                throw new TranscricaoException(status, "STT recusou o áudio; verifique formato, tamanho e duração");
            }
            throw new TranscricaoException(status == 503 ? 503 : 502, "Serviço de transcrição indisponível ou com falha");
        } catch (ResourceAccessException ex) {
            boolean timeout = false;
            for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
                if (cause instanceof HttpTimeoutException || cause instanceof java.net.SocketTimeoutException) timeout = true;
            }
            log.warn("Falha de comunicação STT: timeout={}", timeout);
            throw new TranscricaoException(timeout ? 504 : 503, timeout ? "Tempo limite da transcrição excedido" : "STT indisponível");
        } catch (RestClientException ex) {
            log.warn("Resposta STT ilegível: tipo={}", ex.getClass().getSimpleName());
            throw new TranscricaoException(502, "Resposta inválida do serviço de transcrição");
        } catch (IOException ex) {
            throw new TranscricaoException(400, "Não foi possível ler o áudio recebido");
        }
    }

    private void validarResposta(TranscricaoResponse r) {
        if (r == null || r.nomeArquivo() == null || r.nomeArquivo().isBlank() || r.transcricao() == null
                || !"pt".equals(r.idioma()) || r.duracaoSegundos() == null || !Double.isFinite(r.duracaoSegundos())
                || r.duracaoSegundos() <= 0 || r.probabilidadeIdioma() == null || !Double.isFinite(r.probabilidadeIdioma())
                || r.probabilidadeIdioma() < 0 || r.probabilidadeIdioma() > 1) {
            throw new TranscricaoException(502, "Resposta inválida do serviço de transcrição");
        }
    }

    private String nomeSeguro(String nome) {
        if (nome == null) return "";
        String normalizado = nome.replace('\\', '/');
        return normalizado.substring(normalizado.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}\"]", "_");
    }
}
