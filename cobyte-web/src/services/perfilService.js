import api from './api.js';
import { enviarEConfirmarFoto } from '../utils/fotoPerfil.js';

/**
 * Busca a lista de empresas ativas cadastradas no sistema.
 * @returns {Promise<Array<{ id: number, nome: string, cnpj: string }>>}
 */
export async function listarEmpresas() {
  const { data } = await api.get('/empresas');
  return Array.isArray(data) ? data : [];
}

/**
 * Consulta o perfil completo do usuário autenticado.
 * @returns {Promise<{ id: number, nome: string, email: string, cargo: string, empresa: string, empresaId: number, perfil: string, telefone: string }>}
 */
export async function obterPerfil() {
  const { data } = await api.get('/usuarios/me');
  return data;
}

/**
 * Atualiza os dados editáveis do perfil do próprio usuário.
 * @param {{ nome: string, email: string, cargo?: string, empresa?: string, empresaId?: number, telefone?: string }} dados
 */
export async function atualizarPerfil(dados) {
  const { data } = await api.put('/usuarios/me', dados);
  return data;
}

export default {
  listarEmpresas,
  obterPerfil,
  atualizarPerfil,
};


export async function alterarSenha(senhaAtual, novaSenha) {
  await api.post('/usuarios/alterar-senha', { senhaAtual, novaSenha });
}
export async function enviarFoto(foto) {
  return enviarEConfirmarFoto(api, foto);
}

export async function obterResumoAvaliacoes() {
  const { data } = await api.get('/usuarios/me/avaliacoes');
  return data;
}
