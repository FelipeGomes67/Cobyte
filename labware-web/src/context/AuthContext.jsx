import { useCallback, useEffect, useMemo, useState } from 'react';
import { obterUsuarioDaSessao, cadastrarUsuario, entrar, sair } from '../services/authService';
import { EVENTO_SESSAO_EXPIRADA } from '../services/service';
import { ContextoAutenticacao } from './authContext';

export function ProvedorAutenticacao({ children: conteudo }) {
  const [usuario, definirUsuario] = useState(null);
  const [inicializando, definirInicializando] = useState(true);
  const [erroSessao, definirErroSessao] = useState('');
  const [carregando, definirCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const encerrarSessao = () => definirUsuario(null);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, encerrarSessao);
    obterUsuarioDaSessao().then(usuarioAutenticado => {
      if (ativo) definirUsuario(usuarioAutenticado);
    }).catch(erro => {
      if (ativo && erro.status !== 401) definirErroSessao(erro.message);
    }).finally(() => {
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

  const desconectar = useCallback(() => {
    sair();
    definirUsuario(null);
  }, []);

  const acessarSemLogin = useCallback(() => {
    definirUsuario({
      id: 'visitante',
      nome: 'Visitante',
      name: 'Visitante',
      email: '',
      role: 'support',
    });
    definirErroSessao('');
  }, []);

  const valor = useMemo(() => ({ usuario, carregando, inicializando, erroSessao, autenticar, cadastrar, desconectar, acessarSemLogin }), [usuario, carregando, inicializando, erroSessao, autenticar, cadastrar, desconectar, acessarSemLogin]);
  return <ContextoAutenticacao.Provider value={valor}>{conteudo}</ContextoAutenticacao.Provider>;
}
