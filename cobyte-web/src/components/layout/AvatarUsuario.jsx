import { useEffect, useState } from 'react';
import api, { API_BASE_URL } from '../../services/api';
import { urlHttpSegura } from '../../utils/urlsSeguras';
import { carregarFotoPerfil } from '../../utils/fotoPerfil';
export default function AvatarUsuario({ user, grande = false }) {
  const [falha, setFalha] = useState('');
  const [fotoCarregada, setFotoCarregada] = useState(null);
  const url = urlHttpSegura(user?.fotoPerfil, API_BASE_URL);
  const fotoDaApi = url && new URL(url).origin === new URL(API_BASE_URL).origin;
  useEffect(() => {
    if (!url || !fotoDaApi) return;
    const controle = new AbortController();
    let ativa = true;
    let previa;
    const endereco = new URL(url);
    carregarFotoPerfil(api, endereco.pathname + endereco.search, controle.signal)
      .then(blob => {
        if (!ativa) return;
        previa = URL.createObjectURL(blob);
        setFotoCarregada({ url, previa });
      })
      .catch(() => { /* Mantem as iniciais quando a foto nao esta disponivel. */ });
    return () => {
      ativa = false;
      controle.abort();
      if (previa) URL.revokeObjectURL(previa);
    };
  }, [url, fotoDaApi]);
  const origem = fotoDaApi ? (fotoCarregada?.url === url ? fotoCarregada.previa : '') : url;
  const iniciais = (user?.nome || user?.name || 'Usuário').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return <span className={'avatar' + (grande ? ' avatar-large' : '')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexShrink: 0 }}>
    {origem && falha !== origem ? <img src={origem} alt="" onError={() => setFalha(origem)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : iniciais}
  </span>;
}
