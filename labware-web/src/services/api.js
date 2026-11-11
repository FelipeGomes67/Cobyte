import axios from 'axios';

export const CHAVE_TOKEN = 'labware-token';
export const EVENTO_SESSAO_EXPIRADA = 'labware-sessao-expirada';

// Base URL vinda de variável de ambiente ou fallback para http://localhost:8080
const baseEnv = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const API_BASE_URL = baseEnv.trim().replace(/\/+$/, '');

export function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function salvarToken(token) {
  if (token) {
    localStorage.setItem(CHAVE_TOKEN, token);
  }
}

export function removerToken() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem('token');
  localStorage.removeItem('labware-demo-session-v2');
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisição: normaliza rotas /api e injeta Authorization: Bearer <token>
api.interceptors.request.use(
  config => {
    const baseUrlHasApi = config.baseURL?.endsWith('/api') || config.baseURL?.endsWith('/api/');
    const urlStartsWithApi = config.url?.startsWith('/api/') || config.url === '/api';

    if (baseUrlHasApi && urlStartsWithApi) {
      config.url = config.url.replace(/^\/api/, '');
    } else if (!baseUrlHasApi && !urlStartsWithApi && config.url && !config.url.startsWith('http')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }

    const token = obterToken();
    if (token && config.autenticada !== false) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  erro => Promise.reject(erro)
);

// Interceptor de resposta: tratamento centralizado de erros e expiração de sessão
api.interceptors.response.use(
  resposta => resposta,
  falha => {
    const resposta = falha.response;

    // Se receber 401 e a rota exigia autenticação, desloga e dispara evento de sessão expirada
    if (falha.config?.autenticada !== false && resposta?.status === 401) {
      removerToken();
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }

    let mensagem = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';

    if (resposta) {
      const dados = resposta.data;
      if (dados?.campos && Array.isArray(dados.campos) && dados.campos.length > 0) {
        mensagem = dados.campos.map(c => c.mensagem || `${c.campo} inválido`).join('. ');
      } else if (dados?.mensagem) {
        mensagem = dados.mensagem;
      } else if (resposta.status === 401) {
        mensagem = 'E-mail ou senha inválidos.';
      } else if (resposta.status === 400) {
        mensagem = 'Dados inválidos. Verifique as informações preenchidas.';
      } else if (resposta.status === 409) {
        mensagem = 'E-mail já cadastrado.';
      } else if (resposta.status >= 500) {
        mensagem = 'Erro interno do servidor. Tente novamente mais tarde.';
      }
    } else if (falha.request) {
      mensagem = 'Não foi possível conectar ao servidor. Verifique se a API está ativa.';
    }

    const erro = new Error(mensagem);
    erro.status = resposta?.status;
    erro.response = resposta;
    return Promise.reject(erro);
  }
);

export default api;

