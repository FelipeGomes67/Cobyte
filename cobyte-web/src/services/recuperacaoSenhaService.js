import api, { removerToken, EVENTO_SESSAO_EXPIRADA } from './api.js';

export async function solicitarRecuperacaoSenha(email) {
  await api.post('/auth/esqueci-senha', { email: email.trim() }, { autenticada: false });
}

export async function redefinirSenha(email, codigo, novaSenha) {
  try {
    await api.post('/auth/redefinir-senha', { email: email.trim(), codigo, novaSenha }, { autenticada: false });
  } catch (falha) {
    throw new Error(falha.response?.data?.detail || falha.message || 'Não foi possível redefinir a senha.', { cause: falha });
  }
  removerToken();
  window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
}
