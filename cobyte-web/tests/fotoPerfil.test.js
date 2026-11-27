import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarFotoPerfil } from '../src/utils/fotoPerfil.js';

test('foto usa o cliente da API e preserva versao e cancelamento', async () => {
  const signal = new AbortController().signal;
  const imagem = new Blob(['imagem'], { type: 'image/png' });
  const cliente = { get: async (caminho, opcoes) => {
    assert.equal(caminho, '/api/usuarios/1/foto?v=versao');
    assert.equal(opcoes.responseType, 'blob');
    assert.equal(opcoes.signal, signal);
    return { data: imagem };
  } };
  assert.equal(await carregarFotoPerfil(cliente, '/api/usuarios/1/foto?v=versao', signal), imagem);
});

test('resposta HTML do tunel ou imagem vazia nao sao aceitas como foto', async () => {
  for (const data of [new Blob(['aviso'], { type: 'text/html' }), new Blob([], { type: 'image/png' }), '<html>aviso</html>']) {
    await assert.rejects(carregarFotoPerfil({ get: async () => ({ data }) }, '/foto'), /foto valida/);
  }
});
