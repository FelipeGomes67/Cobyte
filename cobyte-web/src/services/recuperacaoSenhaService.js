import api, { removerToken, EVENTO_SESSAO_EXPIRADA } from './api.js';

export async function solicitarRecuperacaoSenha(email) {
  await api.post('/auth/esqueci-senha', { email: email.trim() }, { autenticada: false });
}

export async function validarCodigoRecuperacao(email, codigo) {
  try {
    const { data } = await api.post('/auth/validar-codigo-recuperacao', { email: email.trim(), codigo }, { autenticada: false });
    if (!/^[A-Za-z0-9_-]{43}$/.test(data?.autorizacao)) throw new Error('Não foi possível confirmar o código. Tente novamente.');
    return data.autorizacao;
  } catch (falha) {
    throw new Error(falha.response?.data?.detail || falha.message || 'Não foi possível validar o código.', { cause: falha });
  }
}

export async function redefinirSenha(email, autorizacao, novaSenha) {
  try {
    await api.post('/auth/redefinir-senha', { email: email.trim(), autorizacao, novaSenha }, { autenticada: false });
  } catch (falha) {
    throw new Error(falha.response?.data?.detail || falha.message || 'Não foi possível redefinir a senha.', { cause: falha });
  }
  removerToken();
  window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
}
