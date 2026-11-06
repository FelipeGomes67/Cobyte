import servico, { obterToken, CHAVE_TOKEN } from './service.js';

function normalizarUsuario(usuario) {
  if (!usuario?.id || !usuario.nome || !['CLIENTE', 'SUPORTE', 'ADMIN'].includes(usuario.perfil)) {
    throw new Error('A API retornou um usuário inválido.');
  }
  return {
    ...usuario,
    id: String(usuario.id),
    // Compatibilidade com as telas de chamados e perfil existentes.
    name: usuario.nome,
    role: usuario.perfil === 'CLIENTE' ? 'client' : 'support',
  };
}

export async function obterUsuarioDaSessao() {
  if (!obterToken()) return null;
  const { data: usuario } = await servico.get('/auth/me');
  return normalizarUsuario(usuario);
}

export async function entrar(email, senha) {
  const { data: dados } = await servico.post('/auth/login', {
    email: String(email || '').trim(),
    senha,
  }, { autenticada: false });
  if (typeof dados?.token !== 'string' || !dados.token) {
    throw new Error('A API não retornou um token de acesso válido.');
  }
  const usuario = normalizarUsuario(dados.usuario);
  localStorage.setItem(CHAVE_TOKEN, dados.token);
  return usuario;
}

export async function cadastrarUsuario({ nome, email, senha }) {
  await servico.post('/auth/cadastrar', {
    nome: String(nome || '').trim(),
    email: String(email || '').trim(),
    senha,
  }, { autenticada: false });
  try {
    return await entrar(email, senha);
  } catch {
    throw new Error('Cadastro concluído, mas não foi possível entrar automaticamente. Acesse a tela de login para entrar na sua conta.');
  }
}

export function sair() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem('labware-demo-session-v2');
}
