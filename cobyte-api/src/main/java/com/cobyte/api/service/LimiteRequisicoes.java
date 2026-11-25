package com.cobyte.api.service;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Semaphore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class LimiteRequisicoes {
    private static final long JANELA_MS = 60_000;
    private static final int LIMITE_CHAVES = 10_000;
    private final Clock relogio;
    private final Semaphore inferencias;
    private final Map<String, Janela> janelas = new HashMap<>();
    private long proximaLimpeza;

    public final int loginIp;
    public final int loginConta;
    public final int cadastroIp;
    public final int iaUsuario;

    @Autowired
    public LimiteRequisicoes(@Value("${cobyte.limites.login-ip:60}") int loginIp,
                             @Value("${cobyte.limites.login-conta:6}") int loginConta,
                             @Value("${cobyte.limites.cadastro-ip:12}") int cadastroIp,
                             @Value("${cobyte.limites.ia-usuario:8}") int iaUsuario,
                             @Value("${cobyte.limites.inferencias-simultaneas:2}") int simultaneas) {
        this(loginIp, loginConta, cadastroIp, iaUsuario, simultaneas, Clock.systemUTC());
    }

    LimiteRequisicoes(int loginIp, int loginConta, int cadastroIp, int iaUsuario, int simultaneas, Clock relogio) {
        if (Math.min(Math.min(loginIp, loginConta), Math.min(cadastroIp, iaUsuario)) < 1 || simultaneas < 1) {
            throw new IllegalArgumentException("Os limites de requisições devem ser positivos");
        }
        this.loginIp = loginIp;
        this.loginConta = loginConta;
        this.cadastroIp = cadastroIp;
        this.iaUsuario = iaUsuario;
        this.inferencias = new Semaphore(simultaneas);
        this.relogio = relogio;
    }

    public synchronized void consumir(String chave, int limite) {
        long agora = relogio.millis();
        if (agora >= proximaLimpeza) {
            janelas.values().removeIf(janela -> janela.terminaEm <= agora);
            proximaLimpeza = agora + JANELA_MS;
        }
        Janela janela = janelas.get(chave);
        if (janela == null || janela.terminaEm <= agora) {
            if (janela == null && janelas.size() >= LIMITE_CHAVES) throw new Excedido(60);
            janela = new Janela(agora + JANELA_MS);
            janelas.put(chave, janela);
        }
        if (janela.usos >= limite) throw new Excedido(Math.max(1, (janela.terminaEm - agora + 999) / 1000));
        janela.usos++;
    }

    public void iniciarInferencia() {
        if (!inferencias.tryAcquire()) throw new Excedido(5);
    }

    public void liberarInferencia() {
        inferencias.release();
    }

    private static final class Janela {
        private final long terminaEm;
        private int usos;

        private Janela(long terminaEm) {
            this.terminaEm = terminaEm;
        }
    }

    public static final class Excedido extends ResponseStatusException {
        private final long segundos;

        public Excedido(long segundos) {
            super(HttpStatus.TOO_MANY_REQUESTS, "Muitas tentativas. Aguarde e tente novamente.");
            this.segundos = segundos;
        }

        @Override
        public HttpHeaders getHeaders() {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.RETRY_AFTER, Long.toString(segundos));
            return headers;
        }
    }
}
