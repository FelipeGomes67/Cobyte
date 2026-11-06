import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Ellipsis, LogOut, Settings, UserRound } from 'lucide-react';

function Avatar({ user }) {
  const initials = user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className="avatar" aria-hidden="true">{initials || <UserRound size={17}/>}</span>;
}

export default function ProfileMenu({ user, onRequestLogout, onNavigate, variant = 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false); // mantém o menu montado durante a animação de saída
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const focusFirstRef = useRef(false);
  const menuId = useId();
  const roleLabel = user.role === 'support' ? 'Suporte' : 'Cliente';

  const closeMenu = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  function openMenu(focusFirst = false) {
    focusFirstRef.current = focusFirst;
    setRendered(true);
    setOpen(true);
  }

  function toggleMenu(event) {
    triggerRef.current = event.currentTarget;
    // event.detail === 0 → acionado pelo teclado (Enter/Espaço): foca o primeiro item
    if (open) closeMenu(); else openMenu(event.detail === 0);
  }

  function handleTriggerKeyDown(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    triggerRef.current = event.currentTarget;
    if (!open) { openMenu(true); return; }
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (items?.length) items[event.key === 'ArrowUp' ? items.length - 1 : 0].focus();
  }

  function handleMenuKeyDown(event) {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    const targets = {
      ArrowDown: index === items.length - 1 ? 0 : index + 1,
      ArrowUp: index <= 0 ? items.length - 1 : index - 1,
      Home: 0,
      End: items.length - 1,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    items[targets[event.key]].focus();
  }

  // Fecha ao clicar fora e com Esc; foca o primeiro item quando aberto por teclado
  useEffect(() => {
    if (!open) return undefined;
    if (focusFirstRef.current) {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus();
      focusFirstRef.current = false;
    }
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) closeMenu();
    }
    function closeEscape(event) {
      if (event.key === 'Escape') closeMenu(rootRef.current?.contains(document.activeElement));
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open, closeMenu]);

  // Desmonta o menu só depois que a animação de saída terminar
  useEffect(() => {
    if (open || !rendered) return undefined;
    const timer = setTimeout(() => setRendered(false), 180);
    return () => clearTimeout(timer);
  }, [open, rendered]);

  function handleBlur(event) {
    const next = event.relatedTarget;
    if (open && next && !event.currentTarget.contains(next)) closeMenu();
  }

  function requestLogout() {
    closeMenu();
    onNavigate?.();
    onRequestLogout();
  }

  function navigate() {
    closeMenu();
    onNavigate?.();
  }

  const triggerProps = {
    onClick: toggleMenu,
    onKeyDown: handleTriggerKeyDown,
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    'aria-controls': rendered ? menuId : undefined,
  };

  return <div className={`profile-menu-anchor profile-menu-anchor--${variant}`} ref={rootRef} onBlur={handleBlur}>
    {variant === 'sidebar' ? <div className="sidebar-profile-trigger-row">
      <button className="sidebar-user" {...triggerProps}>
        <Avatar user={user}/><span className="sidebar-user-label"><strong>{user.name}</strong><small>{roleLabel}</small></span>
      </button>
      <button className="profile-more-button" aria-label="Abrir menu do perfil" {...triggerProps}><Ellipsis size={18}/></button>
    </div> : <button className="user-trigger" {...triggerProps}>
      <Avatar user={user}/><span className="user-name">{user.name}</span><ChevronDown size={15} className="profile-chevron"/>
    </button>}
    {rendered && <div
      id={menuId}
      ref={menuRef}
      className={`profile-menu ${variant === 'sidebar' ? 'sidebar-profile-menu' : 'header-profile-menu'} ${open ? 'is-open' : 'is-closing'}`}
      role="menu"
      aria-label="Menu do perfil"
      onKeyDown={handleMenuKeyDown}
    >
      <Link to="/perfil" role="menuitem" tabIndex={-1} onClick={navigate}><UserRound size={15}/> Ver Perfil</Link>
      <Link to="/configuracoes" role="menuitem" tabIndex={-1} onClick={navigate}><Settings size={15}/> Configurações</Link>
      <button className="menu-danger" role="menuitem" tabIndex={-1} onClick={requestLogout}><span>Sair da conta</span><LogOut size={15}/></button>
    </div>}
  </div>;
}