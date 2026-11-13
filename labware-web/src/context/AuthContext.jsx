import { desativarPush } from '../services/webPushService';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { obterUsuarioDaSessao, cadastrarUsuario, entrar, sair, normalizarUsuario } from '../services/authService';
import { EVENTO_SESSAO_EXPIRADA } from '../services/api';
import { ContextoAutenticacao } from './authContext';

export function ProvedorAutenticacao({ children: conteudo }) {
  const [usuario, definirUsuario] = useState(null);
  const [inicializando, definirInicializando] = useState(true);
  const [erroSessao, definirErroSessao] = useState('');
  const [carregando, definirCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.getRegistration('/').then(registro => {
        if (registro) return registro.update();
      }).catch(() => { /* A versão instalada continua disponível offline. */ });
    }

    const encerrarSessao = () => definirUsuario(null);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, encerrarSessao);

    obterUsuarioDaSessao()
      .then(usuarioAutenticado => {
        if (ativo) definirUsuario(usuarioAutenticado);
      })
      .catch(erro => {
        if (ativo && erro.status !== 401) {
          definirErroSessao(erro.message || 'Sessão expirada. Faça login novamente.');
        }
      })
      .finally(() => {
        if (ativo) definirInicializando(false);
      });

    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, encerrarSessao);
    };
  }, []);

  const autenticar = useCallback(async (email, senha) => {
    definirCarregando(true);
    try {
      const usuarioAutenticado = await entrar(email, senha);
      definirUsuario(usuarioAutenticado);
      definirErroSessao('');
      return usuarioAutenticado;
    } finally {
      definirCarregando(false);
    }
  }, []);

  const cadastrar = useCallback(async dados => {
    definirCarregando(true);
    try {
      const usuarioAutenticado = await cadastrarUsuario(dados);
      definirUsuario(usuarioAutenticado);
      definirErroSessao('');
      return usuarioAutenticado;
    } finally {
      definirCarregando(false);
    }
  }, []);

  const desconectar = useCallback(async () => {
    try { await desativarPush(); } catch { /* Logout continua mesmo se o servidor estiver offline. */ }
    sair();
    definirUsuario(null);
  }, []);

  const atualizarUsuario = useCallback(novosDados => {
    definirUsuario(prev => {
      if (!prev && !novosDados) return null;
      const mesclado = typeof novosDados === 'function' ? novosDados(prev) : { ...prev, ...novosDados };
      return mesclado ? normalizarUsuario(mesclado) : null;
    });
  }, []);

  const valor = useMemo(() => ({
    usuario,
    user: usuario,
    carregando,
    loading: carregando,
    inicializando,
    erroSessao,
    autenticar,
    login: autenticar,
    cadastrar,
    register: cadastrar,
    desconectar,
    logout: desconectar,
    atualizarUsuario,
    updateUser: atualizarUsuario,
  }), [usuario, carregando, inicializando, erroSessao, autenticar, cadastrar, desconectar, atualizarUsuario]);

  return <ContextoAutenticacao.Provider value={valor}>{conteudo}</ContextoAutenticacao.Provider>;
}
