import { NavLink, Outlet } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  CalendarDays,
  Clock,
  History,
  LogOut,
  Sun,
  Moon,
  Layers,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useDarkMode } from '../hooks/useDarkMode';

const navItems = [
  { to: '/leads', label: 'Base de Leads', icon: Users },
  { to: '/templates', label: 'Templates', icon: MessageSquare },
  { to: '/segmentos', label: 'Segmentos', icon: Layers },
  { to: '/cadencias', label: 'Cadências', icon: Clock },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — visível só no desktop */}
      <aside className="hidden md:flex w-60 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <CalendarDays size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">Agenda Edu</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Leads Eventos</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
          <button
            onClick={toggle}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Modo claro' : 'Modo escuro'}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate px-2">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-28 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav — pílula liquid glass */}
      <nav className="md:hidden fixed bottom-5 left-0 right-0 flex justify-center z-50 px-4">
        <div className="flex items-center gap-1 px-2 py-2 rounded-full
          backdrop-blur-2xl
          bg-white/75 dark:bg-gray-900/80
          border border-white/60 dark:border-white/10
          shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.55)]
          ring-1 ring-black/5 dark:ring-white/5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-full transition-all',
                  isActive
                    ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )
              }
            >
              <Icon size={20} />
              <span className="text-[9px] font-medium leading-none">{label.split(' ')[0]}</span>
            </NavLink>
          ))}
          <button
            onClick={toggle}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span className="text-[9px] font-medium leading-none">{isDark ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
