import { MessageCircle, Settings, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <MessageCircle aria-hidden size={26} />
          <div>
            <strong>Atendimento</strong>
            <span>WhatsApp Oficial</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/conversas">
            <MessageCircle size={18} aria-hidden />
            Conversas
          </NavLink>
          <NavLink to="/usuarios">
            <Users size={18} aria-hidden />
            Atendentes
          </NavLink>
          <NavLink to="/configuracoes">
            <Settings size={18} aria-hidden />
            Configuracoes
          </NavLink>
        </nav>

        <div className="profile">
          <div>
            <strong>Acesso interno</strong>
            <span>Sem login inicial</span>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
