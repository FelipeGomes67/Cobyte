package com.labware.api.exception;

import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

public class TranscricaoException extends ResponseStatusException {
    public TranscricaoException(int status, String mensagem) {
        super(HttpStatusCode.valueOf(status), mensagem);
    }
}
