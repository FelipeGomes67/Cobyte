package com.labware.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.restclient.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.List;

@Configuration
public class OllamaClientConfig {

    @Bean
    public RestClientCustomizer ollamaRestClientCustomizer(
            @Value("${spring.ai.ollama.base-url:http://localhost:11434}") String ollamaBaseUrl,
            @Value("${labware.ia.http-connect-timeout-ms:2000}") long connectTimeoutMs,
            @Value("${labware.ia.http-read-timeout-ms:25000}") long readTimeoutMs) {

        URI base = URI.create(ollamaBaseUrl);

        return restClientBuilder -> {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
            requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
            restClientBuilder.requestFactory(requestFactory);
            restClientBuilder.requestInterceptor(normalizarRespostaOllama(base));
        };
    }

    private static ClientHttpRequestInterceptor normalizarRespostaOllama(URI base) {
        return (request, body, execution) -> {
            boolean ehOllama = mesmoServidor(request.getURI(), base);
            if (ehOllama) {
                request.getHeaders().setAccept(List.of(MediaType.APPLICATION_JSON));
            }
            ClientHttpResponse resposta = execution.execute(request, body);
            if (!ehOllama || !resposta.getStatusCode().is2xxSuccessful()) {
                return resposta;
            }
            MediaType tipo = resposta.getHeaders().getContentType();
            if (tipo == null || MediaType.APPLICATION_OCTET_STREAM.equalsTypeAndSubtype(tipo)) {
                return comContentTypeJson(resposta);
            }
            return resposta;
        };
    }

    private static boolean mesmoServidor(URI a, URI b) {
        return a.getHost() != null && a.getHost().equalsIgnoreCase(b.getHost()) && porta(a) == porta(b);
    }

    private static int porta(URI uri) {
        if (uri.getPort() != -1) return uri.getPort();
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }

    private static ClientHttpResponse comContentTypeJson(ClientHttpResponse original) {
        HttpHeaders headers = new HttpHeaders();
        original.getHeaders().forEach((nome, valores) -> headers.addAll(nome, valores));
        headers.setContentType(MediaType.APPLICATION_JSON);

        return new ClientHttpResponse() {
            @Override
            public HttpStatusCode getStatusCode() throws IOException {
                return original.getStatusCode();
            }

            @Override
            public String getStatusText() throws IOException {
                return original.getStatusText();
            }

            @Override
            public void close() {
                original.close();
            }

            @Override
            public InputStream getBody() throws IOException {
                return original.getBody();
            }

            @Override
            public HttpHeaders getHeaders() {
                return headers;
            }
        };
    }
}