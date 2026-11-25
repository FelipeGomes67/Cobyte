package com.cobyte.api.config;

import com.cobyte.api.service.LimiteRequisicoes;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletRequestWrapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

final class FiltroLimiteRequisicoes extends OncePerRequestFilter {
    private final LimiteRequisicoes limites;

    FiltroLimiteRequisicoes(LimiteRequisicoes limites) {
        this.limites = limites;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String rota = request.getServletPath() + (request.getPathInfo() == null ? "" : request.getPathInfo());
        String metodo = request.getMethod();
        var identidade = SecurityContextHolder.getContext().getAuthentication();
        boolean inferencia = rota.startsWith("/api/ai/") || ("POST".equals(metodo) &&
                (rota.equals("/api/chamados") || rota.equals("/api/chamados/transcrever-audio") ||
                        rota.matches("/api/chamados/[^/]+/(transcrever-audio|reclassificar-ia)")));
        boolean reservou = false;
        try {
            if ("POST".equals(metodo) && rota.equals("/api/auth/login")) {
                limites.consumir("login-ip:" + ipDireto(request), limites.loginIp);
            } else if ("POST".equals(metodo) && rota.equals("/api/auth/cadastrar")) {
                limites.consumir("cadastro-ip:" + ipDireto(request), limites.cadastroIp);
            } else if (inferencia && identidade instanceof JwtAuthenticationToken jwt) {
                limites.consumir("ia:" + jwt.getName(), limites.iaUsuario);
                limites.iniciarInferencia();
                reservou = true;
            }
        } catch (LimiteRequisicoes.Excedido erro) {
            response.setStatus(429);
            response.setHeader("Retry-After", erro.getHeaders().getFirst("Retry-After"));
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"mensagem\":\"Muitas tentativas. Aguarde e tente novamente.\"}");
            return;
        }
        try {
            chain.doFilter(request, response);
        } finally {
            if (reservou) limites.liberarInferencia();
        }
    }

    private String ipDireto(ServletRequest request) {
        while (request instanceof ServletRequestWrapper wrapper) request = wrapper.getRequest();
        // Um único limite é compartilhado pelas entradas do túnel. Cabeçalhos do cliente não alteram a chave.
        return request.getRemoteAddr();
    }
}
