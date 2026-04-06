import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Link as LinkIcon,
  ClipboardList,
  MessageSquare,
  CalendarDays,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/kanban', label: 'Kanban', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/form/sorteio', label: 'Form Sorteio', icon: LinkIcon },
  { to: '/form/consultor', label: 'Form Consultor', icon: ClipboardList },
  { to: '/templates', label: 'Templates', icon: MessageSquare },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <CalendarDays size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Agenda Edu</p>
              <p className="text-xs text-gray-500 mt-0.5">Leads Eventos</p>
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
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">Agenda Edu © 2025</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
