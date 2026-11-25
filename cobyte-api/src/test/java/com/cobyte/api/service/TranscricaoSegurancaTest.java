package com.cobyte.api.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class TranscricaoSegurancaTest {
    @Test void enviaChaveInternaAoSttSemUsarServidorReal() {
        String chave = "chave-sintetica-exclusiva-de-testes-stt";
        var builder = TranscricaoService.autenticar(RestClient.builder().baseUrl("http://stt.test"), chave);
        var servidor = MockRestServiceServer.bindTo(builder).build();
        servidor.expect(requestTo("http://stt.test/transcrever"))
                .andExpect(header("X-Internal-Api-Key", chave))
                .andRespond(withSuccess("""
                    {"nomeArquivo":"audio.wav","duracaoSegundos":1.0,"idioma":"pt","probabilidadeIdioma":1.0,"transcricao":"Relato"}
                    """, MediaType.APPLICATION_JSON));
        var service = new TranscricaoService(builder.build(), 1024);
        var audio = new MockMultipartFile("arquivo", "audio.wav", "audio/wav", new byte[] {82,73,70,70,0,0,0,0,87,65,86,69});
        assertEquals("Relato", service.transcreverAudio(audio).transcricao());
        servidor.verify();
    }

    @Test void recusaChaveCurtaEDestinoRemotoSemChave() {
        assertThrows(IllegalArgumentException.class, () -> TranscricaoService.autenticar(RestClient.builder(), "curta"));
        assertThrows(IllegalArgumentException.class, () -> new TranscricaoService("http://stt.test", 10, 1024, ""));
    }
}
