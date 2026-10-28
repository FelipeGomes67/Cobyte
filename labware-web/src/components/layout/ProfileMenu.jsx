import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Ellipsis, LogOut, Settings, UserRound } from 'lucide-react';

function Avatar({ user }) {
  const initials = user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className="avatar" aria-hidden="true">{initials || <UserRound size={17}/>}</span>;
}

export default function ProfileMenu({ user, onRequestLogout, onNavigate, variant = 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const roleLabel = user.role === 'support' ? 'Suporte' : 'Cliente';

  useEffect(() => {
    if (!open) return undefined;
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  function requestLogout() {
    setOpen(false);
    onNavigate?.();
    onRequestLogout();
  }

  function navigate() {
    setOpen(false);
    onNavigate?.();
  }

  return <div className={`profile-menu-anchor profile-menu-anchor--${variant}`} ref={rootRef}>
    {variant === 'sidebar' ? <div className="sidebar-profile-trigger-row">
      <button className="sidebar-user" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="menu">
        <Avatar user={user}/><span className="sidebar-user-label"><strong>{user.name}</strong><small>{roleLabel}</small></span>
      </button>
      <button className="profile-more-button" onClick={() => setOpen(value => !value)} aria-label="Abrir menu do perfil" aria-expanded={open} aria-haspopup="menu"><Ellipsis size={18}/></button>
    </div> : <button className="user-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="menu">
      <Avatar user={user}/><span className="user-name">{user.name}</span><ChevronDown size={15}/>
    </button>}
    {open && <div className={`profile-menu ${variant === 'sidebar' ? 'sidebar-profile-menu' : 'header-profile-menu'}`} role="menu">
      <Link to="/perfil" role="menuitem" onClick={navigate}><UserRound size={15}/> Ver Perfil</Link>
      <Link to="/configuracoes" role="menuitem" onClick={navigate}><Settings size={15}/> Configurações</Link>
      <button className="menu-danger" role="menuitem" onClick={requestLogout}><span>Sair da conta</span><LogOut size={15}/></button>
    </div>}
  </div>;
}
