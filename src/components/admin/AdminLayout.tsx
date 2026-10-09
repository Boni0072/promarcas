import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Settings, Users, Bell, LogOut, Menu, X, Search, Car as CarIcon, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { setPresence } from '@/lib/presence';
import { getAll, update } from '@/lib/firestore';
import { navSections, navItems, canAccess } from '@/lib/navigation';
import type { Notification } from '@/types';
import { ROLE_LABELS, formatDate } from '@/lib/utils';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading, signOut, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Seções do menu recolhíveis — iniciam TODAS recolhidas
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(navSections.map((s) => s.title))
  );

  useEffect(() => {
    async function loadNotifications() {
      const all = await getAll<Notification>('notifications');
      all.sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      });
      setNotifications(all.slice(0, 20));
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Rastreia a presença do usuário logado (qual página ele está acessando)
  useEffect(() => {
    if (!user || !profile) return;
    const label = navItems.find((i) =>
      i.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(i.path)
    )?.label || 'Admin';
    setPresence(user.uid, location.pathname, label, profile.name || 'Usuário');
  }, [user, profile, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="card max-w-md p-8 text-center">
          <p className="text-gray-600">Seu perfil ainda está sendo carregado. Se o problema persistir, contate o administrador.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(profile, item.path, item.roles)),
    }))
    .filter((section) => section.items.length > 0);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  async function markAllRead() {
    for (const n of notifications.filter((n) => !n.read)) {
      await update('notifications', n.id, { read: true });
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const isActive = (path: string) => path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-cherry-900 bg-cherry-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-cherry-900 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="rounded-md bg-white px-2 py-1">
              <img src="/Promarc.png" alt="PRÓMARCAS MOTORS" className="h-15 w-auto" />
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-white/100 hover:bg-cherry-900 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          <div className="space-y-1">
            {visibleSections.map((section) => {
              const isCollapsed = collapsedSections.has(section.title);
              const hasActive = section.items.some((item) => isActive(item.path));
              return (
                <div key={section.title}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-cherry-900"
                    aria-expanded={!isCollapsed}
                  >
                    <span
                      className={`text-[11px] font-bold tracking-wider uppercase ${
                        hasActive ? 'text-white' : 'text-white/70'
                      }`}
                    >
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="mt-0.5 mb-1 space-y-0.5 animate-slide-up">
                      {section.items.map((item) => {
                        const active = isActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                              active
                                ? 'bg-white text-cherry-800 shadow-sm'
                                : 'text-white/90 hover:bg-cherry-900 hover:text-white'
                            }`}
                          >
                            <item.icon className={`h-5 w-5 ${active ? 'text-cherry-700' : 'text-white/80'}`} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-cherry-900 pt-4">
            <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-cherry-900 hover:text-white">
              <CarIcon className="h-5 w-5 text-white/80" /> Ver vitrine pública
            </Link>
          </div>
        </nav>

        <div className="border-t border-cherry-900 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-cherry-800">
              {profile.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile.name || 'Usuário'}</p>
              <p className="text-xs text-white/70">{ROLE_LABELS[profile.role] || profile.role}</p>
            </div>
            <button onClick={handleSignOut} className="rounded-lg p-1.5 text-white/80 hover:bg-cherry-900 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-gray-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {navItems.find((i) => isActive(i.path))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-2xl animate-slide-up">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                      <h3 className="font-bold text-gray-900">Notificações</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma notificação</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`border-b border-gray-100 px-4 py-3 ${!n.read ? 'bg-primary-50/50' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                                n.type === 'danger' ? 'bg-error-500' :
                                n.type === 'warning' ? 'bg-warning-500' :
                                n.type === 'success' ? 'bg-success-500' : 'bg-primary-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                                <p className="text-xs text-gray-500">{n.message}</p>
                                <p className="mt-0.5 text-xs text-gray-400">{formatDate(n.created_at)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
