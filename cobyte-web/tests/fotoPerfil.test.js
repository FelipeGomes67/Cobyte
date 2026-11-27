import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarFotoPerfil, enviarEConfirmarFoto } from '../src/utils/fotoPerfil.js';

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

test('so confirma sucesso depois de reler o perfil e a imagem salva', async () => {
  const perfil = { id: 1, fotoPerfil: '/api/usuarios/1/foto?v=nova' };
  const chamadas = [];
  const foto = new Blob(['imagem'], { type: 'image/png' });
  const cliente = {
    post: async (caminho, dados) => {
      chamadas.push(caminho);
      assert.equal(dados.get('foto').name, 'perfil.png');
      assert.equal(dados.get('foto').size, foto.size);
      return { data: perfil };
    },
    get: async caminho => {
      chamadas.push(caminho);
      return { data: caminho === '/usuarios/me' ? perfil : foto };
    },
  };
  assert.equal(await enviarEConfirmarFoto(cliente, foto), perfil);
  assert.deepEqual(chamadas, ['/usuarios/me/foto', '/usuarios/me', perfil.fotoPerfil]);
});

test('nao anuncia sucesso quando a API mantem a foto anterior', async () => {
  const cliente = {
    post: async () => ({ data: { id: 1, fotoPerfil: '/api/usuarios/1/foto?v=nova' } }),
    get: async () => ({ data: { id: 1, fotoPerfil: '/api/usuarios/1/foto?v=antiga' } }),
  };
  await assert.rejects(enviarEConfirmarFoto(cliente, new Blob(['foto'])), /nao foi confirmada/);
});

test('nao anuncia sucesso quando o upload devolve HTML ou a imagem nao esta acessivel', async () => {
  const foto = new Blob(['foto']);
  await assert.rejects(enviarEConfirmarFoto({ post: async () => ({ data: '<html>aviso</html>' }) }, foto), /nao confirmou/);
  const perfil = { id: 1, fotoPerfil: '/api/usuarios/1/foto?v=nova' };
  const cliente = {
    post: async () => ({ data: perfil }),
    get: async caminho => ({ data: caminho === '/usuarios/me' ? perfil : new Blob(['aviso'], { type: 'text/html' }) }),
  };
  await assert.rejects(enviarEConfirmarFoto(cliente, foto), /nao foi possivel carregar/);
});

test('resposta HTML do tunel ou imagem vazia nao sao aceitas como foto', async () => {
  for (const data of [new Blob(['aviso'], { type: 'text/html' }), new Blob([], { type: 'image/png' }), '<html>aviso</html>']) {
    await assert.rejects(carregarFotoPerfil({ get: async () => ({ data }) }, '/foto'), /foto valida/);
  }
});
