import { UserRound } from 'lucide-react';
import { useAutenticacao } from '../hooks/useAuth';

export default function ProfilePage() {
  const { usuario: user } = useAutenticacao();
  const initials = user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const role = user.role === 'support' ? 'Suporte' : 'Cliente';
  return <>
    <div className="page-heading"><div><div className="eyebrow">Central de Suporte</div><h1>Meu perfil</h1><p>Informações da conta conectada.</p></div></div>
    <section className="panel profile-panel"><span className="avatar avatar-large">{initials}</span><div><h2>{user.name}</h2><p>Conta {role} · Central de Suporte</p><p>{user.email}</p></div><span className="profile-status"><UserRound size={15}/> Conectado</span></section>
  </>;
}
