import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { entrar, cadastrarUsuario, obterUsuarioDaSessao, sair } from '../src/services/authService.js';
import servico from '../src/services/service.js';

const usuario = { id: 7, nome: 'Maria Silva', email: 'maria@example.com', perfil: 'CLIENTE' };
let requisicoes;
let respostas;
let eventos;
beforeEach(() => {
  const armazenamento = new Map();
  globalThis.localStorage = { getItem: key => armazenamento.get(key) ?? null, setItem: (key, value) => armazenamento.set(key, value), removeItem: key => armazenamento.delete(key) };
  eventos = [];
  globalThis.window = { dispatchEvent: event => eventos.push(event.type) };
  requisicoes = [];
  respostas = [];
  servico.defaults.adapter = async configuracao => {
    requisicoes.push(configuracao);
    const [status, dados] = respostas.shift();
    const resposta = { status, data: dados, config: configuracao, headers: {} };
    if (status >= 400) {
      const falha = new Error('Falha HTTP simulada');
      falha.response = resposta;
      falha.config = configuracao;
      throw falha;
    }
    return resposta;
  };
});

test('login usa o contrato da API e persiste somente o token', async () => {
  respostas.push([200, { token: 'jwt-test', usuario }]);
  const usuarioRecebido = await entrar(' maria@example.com ', 'senha123');
  assert.equal(usuarioRecebido.name, 'Maria Silva');
  assert.equal(usuarioRecebido.role, 'client');
  assert.deepEqual(JSON.parse(requisicoes[0].data), { email: usuario.email, senha: 'senha123' });
  assert.equal(localStorage.getItem('labware-token'), 'jwt-test');
  assert.equal(requisicoes[0].headers.has('Authorization'), false);
});

test('cadastro faz login em seguida para obter o JWT', async () => {
  respostas.push([201, usuario], [200, { token: 'novo-token', usuario }]);
  await cadastrarUsuario({ nome: 'Maria Silva', email: usuario.email, senha: 'senha123' });
  assert.equal(requisicoes[0].url, '/auth/cadastrar');
  assert.deepEqual(JSON.parse(requisicoes[0].data), { nome: usuario.nome, email: usuario.email, senha: 'senha123' });
  assert.equal(requisicoes[1].url, '/auth/login');
  assert.equal(localStorage.getItem('labware-token'), 'novo-token');
});

test('restaura identidade pela API e logout remove o token', async () => {
  localStorage.setItem('labware-token', 'salvo');
  respostas.push([200, { ...usuario, perfil: 'ADMIN' }]);
  assert.equal((await obterUsuarioDaSessao()).role, 'support');
  assert.equal(requisicoes[0].headers.get('Authorization'), 'Bearer salvo');
  sair();
  assert.equal(await obterUsuarioDaSessao(), null);
});

test('falha de login exibe mensagem sem salvar token', async () => {
  respostas.push([401, { mensagem: 'E-mail ou senha inválidos' }]);
  await assert.rejects(entrar(usuario.email, 'errada'), /E-mail ou senha inválidos/);
  assert.equal(localStorage.getItem('labware-token'), null);
});

test('401 autenticado encerra a sessão', async () => {
  localStorage.setItem('labware-token', 'expirado');
  respostas.push([401, { mensagem: 'Token expirado' }]);
  await assert.rejects(servico.get('/auth/me'), /Token expirado/);
  assert.equal(localStorage.getItem('labware-token'), null);
  assert.deepEqual(eventos, ['labware-sessao-expirada']);
});

test('cadastro concluído com falha de login orienta entrar pela tela de login', async () => {
  respostas.push([201, usuario], [500, {}]);
  await assert.rejects(cadastrarUsuario({ nome: usuario.nome, email: usuario.email, senha: 'senha123' }), /Cadastro concluído/);
});

