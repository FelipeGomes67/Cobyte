package com.cobyte.api.service;

import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.apache.poi.poifs.filesystem.DirectoryEntry;
import org.apache.poi.poifs.filesystem.DocumentEntry;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.w3c.dom.Document;
import org.xml.sax.helpers.DefaultHandler;

/** Validação estrutural local. Não é uma varredura antivírus. */
final class ValidacaoDocumento {
    private static final int LIMITE_ENTRADA = 8 * 1024 * 1024;
    private static final int LIMITE_EXPANDIDO = 32 * 1024 * 1024;
    private ValidacaoDocumento() {}

    static boolean texto(byte[] dados) {
        try {
            var conteudo = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(dados));
            return conteudo.codePoints().noneMatch(c -> Character.isISOControl(c) && c != '\t' && c != '\n' && c != '\r');
        } catch (Exception ex) { return false; }
    }

    static boolean doc(byte[] dados) {
        try (var fs = new POIFSFileSystem(new ByteArrayInputStream(dados))) {
            var raiz = fs.getRoot();
            if (!raiz.hasEntry("WordDocument") || !estruturaOleSegura(raiz, 0, new int[] {0})) return false;
            byte[] word;
            try (var stream = raiz.createDocumentInputStream("WordDocument")) {
                word = stream.readNBytes(LIMITE_ENTRADA + 1);
            }
            if (word.length < 32 || word.length > LIMITE_ENTRADA
                    || (word[0] & 255) != 0xec || (word[1] & 255) != 0xa5) return false;
            int flags = (word[10] & 255) | ((word[11] & 255) << 8);
            if ((flags & 0x8100) != 0) return false; // criptografado ou ofuscado
            if (!raiz.hasEntry((flags & 0x0200) != 0 ? "1Table" : "0Table")) return false;
            // Campos que podem buscar conteúdo ou iniciar comandos ao abrir no Word.
            for (var charset : new java.nio.charset.Charset[] {StandardCharsets.UTF_16LE, StandardCharsets.ISO_8859_1}) {
                if (java.util.regex.Pattern.compile("\\x13\\s*(DDEAUTO|DDE|INCLUDETEXT|INCLUDEPICTURE|LINK)\\b", java.util.regex.Pattern.CASE_INSENSITIVE)
                        .matcher(new String(word, charset)).find()) return false;
            }
            return true;
        } catch (Exception ex) { return false; }
    }

    private static boolean estruturaOleSegura(DirectoryEntry dir, int profundidade, int[] contagem) {
        if (profundidade > 8) return false;
        for (var entry : dir) {
            if (++contagem[0] > 512) return false;
            String nome = entry.getName().toLowerCase(Locale.ROOT);
            if (nome.contains("vba") || nome.contains("macro") || nome.contains("objectpool")
                    || nome.contains("ole10native") || nome.contains("encrypted") || nome.equals("encryptioninfo")) return false;
            if (entry instanceof DirectoryEntry sub && !estruturaOleSegura(sub, profundidade + 1, contagem)) return false;
            if (entry instanceof DocumentEntry stream && stream.getSize() > LIMITE_ENTRADA) return false;
        }
        return true;
    }

    static boolean docx(byte[] dados) {
        Set<String> nomes = new HashSet<>();
        boolean tipos = false, documento = false, relacaoPrincipal = false;
        int total = 0;
        try (var zip = new ZipInputStream(new ByteArrayInputStream(dados))) {
            java.util.zip.ZipEntry entrada;
            while ((entrada = zip.getNextEntry()) != null) {
                String nome = entrada.getName();
                String minusculo = nome.toLowerCase(Locale.ROOT);
                if (nome.startsWith("/") || nome.contains("\\") || nome.contains(":") || nome.contains("..")
                        || !nomes.add(minusculo) || nomes.size() > 512) return false;
                if (minusculo.contains("vbaproject") || minusculo.contains("activex") || minusculo.contains("embeddings/")
                        || minusculo.contains("macros") || minusculo.contains("altchunk")) return false;
                byte[] conteudo = zip.readNBytes(LIMITE_ENTRADA + 1);
                total += conteudo.length;
                if (conteudo.length > LIMITE_ENTRADA || total > LIMITE_EXPANDIDO) return false;
                if (entrada.isDirectory()) {
                    if (conteudo.length != 0) return false;
                    continue;
                }
                if (!minusculo.matches(".*\\.(xml|rels|png|jpg|jpeg|gif|webp)$")) return false;
                if (minusculo.endsWith(".xml") || minusculo.endsWith(".rels")) {
                    Document xml = lerXml(conteudo);
                    var elementos = xml.getElementsByTagName("*");
                    // O Word pode dividir uma única instrução entre vários runs instrText.
                    // Verificar fragmentos isolados permite contornar a política (DD + EAUTO).
                    var instrucoes = new StringBuilder();
                    for (int i = 0; i < elementos.getLength(); i++) {
                        var el = (org.w3c.dom.Element) elementos.item(i);
                        String conteudoTipo = el.getAttribute("ContentType").toLowerCase(Locale.ROOT);
                        if (conteudoTipo.contains("macroenabled") || conteudoTipo.contains("vba") || conteudoTipo.contains("oleobject")) return false;
                        if ("altChunk".equals(el.getLocalName())) return false;
                        if ("Relationship".equals(el.getLocalName())) {
                            String relacao = el.getAttribute("Type").toLowerCase(Locale.ROOT);
                            if (relacao.endsWith("/attachedtemplate") || relacao.endsWith("/oleobject") || relacao.endsWith("/package")) return false;
                            if ("External".equalsIgnoreCase(el.getAttribute("TargetMode"))) {
                                String destino = el.getAttribute("Target").toLowerCase(Locale.ROOT);
                                if (!relacao.endsWith("/hyperlink") || !(destino.startsWith("https://") || destino.startsWith("http://") || destino.startsWith("mailto:"))) return false;
                            }
                            if (nome.equals("_rels/.rels") && relacao.endsWith("/officedocument")
                                    && el.getAttribute("Target").equals("word/document.xml")
                                    && !"External".equalsIgnoreCase(el.getAttribute("TargetMode"))) relacaoPrincipal = true;
                        }
                        if ("instrText".equals(el.getLocalName())) instrucoes.append(el.getTextContent());
                        if ("fldSimple".equals(el.getLocalName())) instrucoes.append(' ')
                                .append(el.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "instr")).append(' ');
                        if (nome.equals("[Content_Types].xml") && el.getAttribute("PartName").equals("/word/document.xml")
                                && conteudoTipo.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml")) tipos = true;
                    }
                    if (instrucoes.toString().toUpperCase(Locale.ROOT)
                            .matches("(?s).*\\b(DDEAUTO|DDE|INCLUDETEXT|INCLUDEPICTURE|LINK)\\b.*")) return false;
                    if (nome.equals("word/document.xml")) documento = "document".equals(xml.getDocumentElement().getLocalName())
                            && "http://schemas.openxmlformats.org/wordprocessingml/2006/main".equals(xml.getDocumentElement().getNamespaceURI());
                }
                zip.closeEntry();
            }
            return tipos && documento && relacaoPrincipal;
        } catch (Exception ex) { return false; }
    }

    private static Document lerXml(byte[] dados) throws Exception {
        var factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        var parser = factory.newDocumentBuilder();
        parser.setErrorHandler(new DefaultHandler());
        return parser.parse(new ByteArrayInputStream(dados));
    }
}
