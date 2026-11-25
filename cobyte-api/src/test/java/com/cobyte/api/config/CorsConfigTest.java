package com.cobyte.api.config;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.DefaultCorsProcessor;
import static org.junit.jupiter.api.Assertions.*;

class CorsConfigTest {
    @Test void preflightAceitaVercelLocalhostEOrigemAdicionalComCredenciais() throws Exception {
        var config = new SecurityConfig(null, null, null);
        for (String origem : List.of("https://cobyte.vercel.app", "https://cobyte-preview-123.vercel.app",
                "http://localhost:5173", "http://127.0.0.1:5174", "https://suporte.exemplo.com")) {
            var source = config.corsConfigurationSource(origem.endsWith(".vercel.app")
                    ? List.of() : List.of("", " https://suporte.exemplo.com "));
            for (String metodo : List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")) {
                var request = new MockHttpServletRequest("OPTIONS", "/api/chamados");
                request.addHeader("Origin", origem);
                request.addHeader("Access-Control-Request-Method", metodo);
                request.addHeader("Access-Control-Request-Headers", "Authorization, Content-Type");
                var response = new MockHttpServletResponse();
                assertTrue(new DefaultCorsProcessor().processRequest(source.getCorsConfiguration(request), request, response));
                assertEquals(origem, response.getHeader("Access-Control-Allow-Origin"));
                assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
            }
        }
    }

    @Test void rejeitaOrigemNaoAutorizada() {
        var request = new MockHttpServletRequest("OPTIONS", "/api/chamados");
        var config = new SecurityConfig(null, null, null).corsConfigurationSource(List.of()).getCorsConfiguration(request);
        assertNotNull(config);
        assertNull(config.checkOrigin("https://vercel.app.exemplo.com"));
        assertNull(config.checkOrigin("https://outra-origem.com"));
    }

    @Test void origemExplicitaRestringeOsDominiosDaVercel() {
        var request = new MockHttpServletRequest("OPTIONS", "/api/chamados");
        var source = new SecurityConfig(null, null, null).corsConfigurationSource(List.of("https://cobyte.vercel.app"));
        var config = source.getCorsConfiguration(request);
        assertNotNull(config);
        assertEquals("https://cobyte.vercel.app", config.checkOrigin("https://cobyte.vercel.app"));
        assertNull(config.checkOrigin("https://outro-app.vercel.app"));
    }
}
