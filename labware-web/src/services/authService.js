import api, { obterToken, salvarToken, removerToken } from './api.js';

export function normalizarUsuario(usuario) {
  if (!usuario?.id || !usuario.nome || !['CLIENTE', 'SUPORTE', 'ADMIN'].includes(usuario.perfil)) {
    throw new Error('A API retornou um formato de usuário inválido.');
  }
  return {
    ...usuario,
    id: String(usuario.id),
    // Compatibilidade com telas legadas de perfil, sidebar e chamados
    name: usuario.nome,
    role: usuario.perfil === 'CLIENTE' ? 'client' : 'support',
  };
}

export async function obterUsuarioDaSessao() {
  if (!obterToken()) return null;
  const { data: usuario } = await api.get('/api/usuarios/me');
  return normalizarUsuario(usuario);
}

export async function entrar(email, senha) {
  const payload = {
    email: String(email || '').trim(),
    senha,
  };

  const { data: dados } = await api.post('/api/auth/login', payload, { autenticada: false });

  if (typeof dados?.token !== 'string' || !dados.token) {
    throw new Error('A API não retornou um token de acesso válido.');
  }

  salvarToken(dados.token);
  const { data: perfil } = await api.get('/api/usuarios/me');
  const usuario = normalizarUsuario(perfil);
  return { ...usuario, token: dados.token };
}

export async function cadastrarUsuario({ nome, email, senha, empresaInformada }) {
  const payload = {
    nome: String(nome || '').trim(),
    email: String(email || '').trim(),
    senha,
    empresaInformada: String(empresaInformada || "").trim(),
  };

  await api.post('/api/auth/cadastrar', payload, { autenticada: false });

  // Realiza o login automático após cadastro bem-sucedido
  try {
    return await entrar(email, senha);
  } catch {
    throw new Error('Cadastro concluído, mas não foi possível entrar automaticamente. Acesse a tela de login para entrar.');
  }
}

export function sair() {
  removerToken();
}

export const login = entrar;
export const cadastrar = cadastrarUsuario;
export const logout = sair;
export const getUsuarioAtual = obterUsuarioDaSessao;
