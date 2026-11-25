package com.cobyte.api.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class ValidacaoDocumentoTest {
    @TempDir Path diretorio;

    @Test void aceitaTxtUtf8EExibeConteudoComoTexto() {
        assertTrue(ValidacaoDocumento.texto("Relatório: ação\nLinha 2\tOK".getBytes(StandardCharsets.UTF_8)));
        assertTrue(ValidacaoDocumento.texto("<script>alert('texto apenas')</script>".getBytes(StandardCharsets.UTF_8)));
        assertFalse(ValidacaoDocumento.texto(new byte[] {0, 1, 2}));
        assertFalse(ValidacaoDocumento.texto(new byte[] {(byte) 0xc3, 0x28}));
    }

    @Test void uploadTxtIgnoraMimeForjadoMasRejeitaBinarioEExecutavel() {
        var armazenamento = new FileStorageService(diretorio.toString(), 1024);
        assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L,
                new MockMultipartFile("arquivo", "relato.txt", "application/x-msdownload", "texto".getBytes(StandardCharsets.UTF_8))));
        assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L,
                new MockMultipartFile("arquivo", "falso.txt", "text/plain", new byte[] {77, 90, 0})));
        byte[] binarioAposCabecalho = new byte[64];
        java.util.Arrays.fill(binarioAposCabecalho, (byte) 'a');
        binarioAposCabecalho[63] = 0;
        assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L,
                new MockMultipartFile("arquivo", "cauda.txt", "text/plain", binarioAposCabecalho)));
        assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L,
                new MockMultipartFile("arquivo", "foto.png.exe", "image/png", "texto".getBytes(StandardCharsets.UTF_8))));
        assertThrows(ResponseStatusException.class, () -> TipoArquivoPermitido.identificar("arquivo.txt", "texto".getBytes(StandardCharsets.UTF_8), true));
    }

    @Test void aceitaDocxComEstruturaWordERejeitaZipRenomeado() throws Exception {
        assertTrue(ValidacaoDocumento.docx(zip(partesDocx())));
        assertFalse(ValidacaoDocumento.docx(zip(Map.of("qualquer.txt", new byte[] {1}))));
        assertFalse(ValidacaoDocumento.docx("PK arquivo falso".getBytes(StandardCharsets.UTF_8)));
    }

    @Test void armazenamentoLocalValidaDocxCompletoAntesDeGravar() throws Exception {
        var armazenamento = new FileStorageService(diretorio.toString(), 1024 * 1024);
        assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L,
                new MockMultipartFile("arquivo", "relato.docx", "application/zip", zip(partesDocx()))));
        var partes = partesDocx();
        partes.put("word/vbaProject.bin", new byte[] {1});
        assertThrows(ResponseStatusException.class, () -> armazenamento.salvar(1L,
                new MockMultipartFile("arquivo", "macro.docx", "application/zip", zip(partes))));
        try (var arquivos = java.nio.file.Files.list(diretorio.resolve("1"))) {
            assertEquals(0, arquivos.count(), "Upload rejeitado não deve deixar arquivo no disco");
        }
    }

    @Test void rejeitaMacrosObjetosEEntidadesExternasNoDocx() throws Exception {
        for (String caminho : new String[] {"word/vbaProject.bin", "word/embeddings/objeto.bin", "../escape.xml", "word/activeX/control.xml"}) {
            var partes = partesDocx();
            partes.put(caminho, new byte[] {1});
            assertFalse(ValidacaoDocumento.docx(zip(partes)), caminho);
        }
        var partes = partesDocx();
        partes.put("word/document.xml", "<!DOCTYPE document [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><document>&x;</document>".getBytes(StandardCharsets.UTF_8));
        assertFalse(ValidacaoDocumento.docx(zip(partes)));
    }

    @Test void rejeitaRelacaoExternaAutomaticaMasPermiteHyperlinkHttps() throws Exception {
        var partes = partesDocx();
        for (String tipo : new String[] {"attachedTemplate", "oleObject", "image"}) {
            partes.put("word/_rels/document.xml.rels", relacao(tipo, "https://exemplo.com/arquivo", true));
            assertFalse(ValidacaoDocumento.docx(zip(partes)), tipo);
        }
        partes.put("word/_rels/document.xml.rels", relacao("hyperlink", "https://exemplo.com", true));
        assertTrue(ValidacaoDocumento.docx(zip(partes)));
        partes.put("word/_rels/document.xml.rels", relacao("hyperlink", "file:///arquivo", true));
        assertFalse(ValidacaoDocumento.docx(zip(partes)));
    }

    @Test void rejeitaCamposPerigososMesmoFragmentadosOuCodificadosEmXml() throws Exception {
        for (String comando : new String[] {"DDEAUTO", "DDE", "INCLUDETEXT", "INCLUDEPICTURE", "LINK"}) {
            var partes = partesDocx();
            String primeiro = comando.substring(0, 2);
            String restante = comando.substring(2);
            String campo = "<w:r><w:fldChar w:fldCharType='begin'/></w:r>"
                    + "<w:r><w:instrText> " + primeiro + "</w:instrText></w:r>"
                    + "<w:r><w:instrText>" + restante + " marcador </w:instrText></w:r>"
                    + "<w:r><w:fldChar w:fldCharType='end'/></w:r>";
            partes.put("word/document.xml", documentoComCampo(campo));
            assertFalse(ValidacaoDocumento.docx(zip(partes)), comando + " fragmentado");
        }
        var partes = partesDocx();
        partes.put("word/document.xml", documentoComCampo("<w:fldSimple w:instr='&#68;DEAUTO marcador'/>"));
        assertFalse(ValidacaoDocumento.docx(zip(partes)), "Entidade numérica XML também deve ser verificada");
    }

    @Test void permiteCamposNormaisDePaginacaoEmDocx() throws Exception {
        var partes = partesDocx();
        partes.put("word/document.xml", documentoComCampo("<w:r><w:instrText> PAGE </w:instrText></w:r>"
                + "<w:fldSimple w:instr='NUMPAGES'/><w:r><w:t>Relatório normal</w:t></w:r>"));
        assertTrue(ValidacaoDocumento.docx(zip(partes)));
    }

    private byte[] documentoComCampo(String campo) {
        return ("<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'>"
                + "<w:body><w:p>" + campo + "</w:p></w:body></w:document>").getBytes(StandardCharsets.UTF_8);
    }

    @Test void rejeitaExpansaoExcessivaEConteudoEmDiretorioZip() throws Exception {
        var partes = partesDocx();
        partes.put("word/grande.xml", new byte[8 * 1024 * 1024 + 1]);
        assertFalse(ValidacaoDocumento.docx(zip(partes)));
        partes = partesDocx();
        partes.put("word/pasta/", new byte[] {1});
        assertFalse(ValidacaoDocumento.docx(zip(partes)));
    }

    @Test void docExigeEstruturaWordSemMacrosObjetosOuCriptografia() throws Exception {
        assertTrue(ValidacaoDocumento.doc(doc(null, false)));
        for (String nome : new String[] {"Macros", "_VBA_PROJECT_CUR", "ObjectPool", "EncryptedPackage"}) {
            assertFalse(ValidacaoDocumento.doc(doc(nome, false)), nome);
        }
        assertFalse(ValidacaoDocumento.doc(doc(null, true)));
        try (var fs = new POIFSFileSystem(); var saida = new ByteArrayOutputStream()) {
            fs.createDocument(new ByteArrayInputStream(new byte[32]), "Workbook");
            fs.writeFilesystem(saida);
            assertFalse(ValidacaoDocumento.doc(saida.toByteArray()));
        }
    }

    private byte[] doc(String pasta, boolean criptografado) throws Exception {
        try (var fs = new POIFSFileSystem(); var saida = new ByteArrayOutputStream()) {
            byte[] fib = new byte[32]; fib[0] = (byte) 0xec; fib[1] = (byte) 0xa5;
            if (criptografado) fib[11] = 1;
            fs.createDocument(new ByteArrayInputStream(fib), "WordDocument");
            fs.createDocument(new ByteArrayInputStream(new byte[32]), "0Table");
            if (pasta != null) fs.createDirectory(pasta);
            fs.writeFilesystem(saida);
            return saida.toByteArray();
        }
    }

    private Map<String, byte[]> partesDocx() {
        var partes = new LinkedHashMap<String, byte[]>();
        partes.put("[Content_Types].xml", ("<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Override PartName='/word/document.xml' ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'/></Types>").getBytes(StandardCharsets.UTF_8));
        partes.put("word/document.xml", "<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'><w:body/></w:document>".getBytes(StandardCharsets.UTF_8));
        partes.put("_rels/.rels", relacao("officeDocument", "word/document.xml", false));
        return partes;
    }

    private byte[] relacao(String tipo, String destino, boolean externa) {
        return ("<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/" + tipo + "' Target='" + destino + "'" + (externa ? " TargetMode='External'" : "") + "/></Relationships>").getBytes(StandardCharsets.UTF_8);
    }

    private byte[] zip(Map<String, byte[]> partes) throws Exception {
        var saida = new ByteArrayOutputStream();
        try (var zip = new ZipOutputStream(saida)) {
            for (var parte : partes.entrySet()) {
                zip.putNextEntry(new ZipEntry(parte.getKey()));
                zip.write(parte.getValue());
                zip.closeEntry();
            }
        }
        return saida.toByteArray();
    }
}
