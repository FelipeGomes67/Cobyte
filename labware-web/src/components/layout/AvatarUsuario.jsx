import { useState } from 'react';
import { API_BASE_URL } from '../../services/api';
export default function AvatarUsuario({ user, grande = false }) {
  const [falha, setFalha] = useState('');
  const url = user?.fotoPerfil ? new URL(user.fotoPerfil, API_BASE_URL).href : '';
  const iniciais = (user?.nome || user?.name || 'Usuário').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return <span className={'avatar' + (grande ? ' avatar-large' : '')}>
    {url && falha !== url ? <img src={url} alt="" onError={() => setFalha(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', justifyContent: 'center' }} /> : iniciais}
  </span>;
}
