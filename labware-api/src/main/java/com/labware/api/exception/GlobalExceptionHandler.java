package com.labware.api.exception;

import java.time.Instant;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.http.converter.HttpMessageNotReadableException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    // Validação do @Valid no corpo: devolve 400 com a lista de campos
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {

        List<ErroResponse.CampoInvalido> campos = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> new ErroResponse.CampoInvalido(f.getField(), f.getDefaultMessage()))
                .toList();

        return montar(status, "Dados inválidos", campos, request);
    }

    // Ponto único: ResponseStatusException e as exceções padrão do MVC passam por aqui
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {

        String mensagem = (ex instanceof ErrorResponse er && er.getBody().getDetail() != null)
                ? er.getBody().getDetail()
                : textoPadrao(status);

        return montar(status, mensagem, List.of(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> acessoNegado(AccessDeniedException ex, WebRequest request) {
        return montar(HttpStatus.FORBIDDEN, "Você não tem permissão para esta ação", List.of(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> conflitoDeDados(DataIntegrityViolationException ex, WebRequest request) {
        log.warn("Violação de integridade: {}", ex.getMostSpecificCause().getMessage());
        return montar(HttpStatus.CONFLICT, "Conflito com dados já existentes", List.of(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> inesperado(Exception ex, WebRequest request) {
        log.error("Erro inesperado em {}", ((ServletWebRequest) request).getRequest().getRequestURI(), ex);
        return montar(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno. Tente novamente mais tarde.", List.of(), request);
    }

    private ResponseEntity<Object> montar(HttpStatusCode status, String mensagem,
                                          List<ErroResponse.CampoInvalido> campos, WebRequest request) {
        String caminho = ((ServletWebRequest) request).getRequest().getRequestURI();
        ErroResponse corpo = new ErroResponse(
                Instant.now(), status.value(), textoPadrao(status), mensagem, caminho, campos);
        return ResponseEntity.status(status).body(corpo);
    }

    private String textoPadrao(HttpStatusCode status) {
        HttpStatus http = HttpStatus.resolve(status.value());
        return http != null ? http.getReasonPhrase() : "Erro";
    }
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        log.warn("Corpo da requisição ilegível: {}", ex.getMostSpecificCause().getMessage());
        return montar(status, "Corpo da requisição ausente ou inválido (JSON malformado ou tipo incorreto)",
                List.of(), request);
    }
}