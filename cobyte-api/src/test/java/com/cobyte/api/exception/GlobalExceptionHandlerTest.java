package com.cobyte.api.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {
    @Test void errosInternosNaoExibemDetalhesDaInfraestrutura() {
        var handler = new GlobalExceptionHandler();
        var request = new ServletWebRequest(new MockHttpServletRequest("GET", "/api/teste"));
        var erro = new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "tabela_usuario senha_db /caminho/privado");
        var resposta = handler.handleExceptionInternal(erro, null, HttpHeaders.EMPTY, HttpStatus.INTERNAL_SERVER_ERROR, request);
        assertEquals(500, resposta.getStatusCode().value());
        assertNotNull(resposta.getBody());
        assertFalse(resposta.getBody().toString().contains("senha_db"));
        assertFalse(resposta.getBody().toString().contains("tabela_usuario"));
        assertFalse(resposta.getBody().toString().contains("/caminho/privado"));
    }
}
