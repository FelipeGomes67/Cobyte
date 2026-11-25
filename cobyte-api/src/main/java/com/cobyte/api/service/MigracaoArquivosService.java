package com.cobyte.api.service;

import com.cobyte.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;

@Service @RequiredArgsConstructor
public class MigracaoArquivosService {
    private final AnexoRepository anexos;
    private final UsuarioRepository usuarios;
    private final FileStorageService armazenamento;
    private final PerfilService perfis;
    private final TransactionTemplate tx;
    public record Item(String tipo, Long id, String resultado) {}
    public record Resultado(long proximoAnexo, long proximoUsuario, boolean temMais, List<Item> itens) {}

    public Resultado migrar(long aposAnexo, long aposUsuario) {
        var loteAnexos = anexos.findTop20ByIdGreaterThanOrderByIdAsc(aposAnexo);
        var loteUsuarios = usuarios.findTop20ByIdGreaterThanAndFotoPerfilIsNotNullOrderByIdAsc(aposUsuario);
        var itens = new ArrayList<Item>();
        for (var referencia : loteAnexos) {
            try {
                String resultado = tx.execute(status -> {
                    var anexo = anexos.buscarParaMigracao(referencia.getId()).orElseThrow();
                    if (anexo.getCaminhoArquivo().startsWith("db:")) return "Já compartilhado";
                    var arquivo = armazenamento.migrarLocal(anexo.getChamado().getId(), anexo.getCaminhoArquivo(),
                            anexo.getNomeArquivo(), anexo.getTipoConteudo());
                    anexo.setCaminhoArquivo(arquivo.caminhoArquivo());
                    anexo.setTamanhoBytes(arquivo.tamanhoBytes());
                    anexos.save(anexo);
                    return "Copiado para o banco";
                });
                itens.add(new Item("anexo", referencia.getId(), resultado));
            } catch (Exception erro) {
                itens.add(new Item("anexo", referencia.getId(), "Não copiado: verifique o arquivo local nesta máquina"));
            }
        }
        for (var usuario : loteUsuarios) {
            try {
                Boolean copiado = tx.execute(status -> {
                    try { return perfis.migrarFotoLocal(usuario.getId()); }
                    catch (java.io.IOException erro) { throw new java.io.UncheckedIOException(erro); }
                });
                itens.add(new Item("foto", usuario.getId(), Boolean.TRUE.equals(copiado) ? "Copiada para o banco" : "Já compartilhada"));
            } catch (Exception erro) {
                itens.add(new Item("foto", usuario.getId(), "Não copiada: verifique a foto local nesta máquina"));
            }
        }
        long ultimoAnexo = loteAnexos.isEmpty() ? aposAnexo : loteAnexos.get(loteAnexos.size()-1).getId();
        long ultimoUsuario = loteUsuarios.isEmpty() ? aposUsuario : loteUsuarios.get(loteUsuarios.size()-1).getId();
        return new Resultado(ultimoAnexo, ultimoUsuario, loteAnexos.size()==20 || loteUsuarios.size()==20, itens);
    }
}
