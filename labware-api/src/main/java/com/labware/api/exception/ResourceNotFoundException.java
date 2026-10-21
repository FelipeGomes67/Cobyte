package com.labware.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class ResourceNotFoundException extends ResponseStatusException {
    public ResourceNotFoundException(String mensagem) {
        super(HttpStatus.NOT_FOUND, mensagem);
    }
}
