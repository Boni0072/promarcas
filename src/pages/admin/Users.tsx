import { useState, useEffect } from 'react';
import { Users as UsersIcon, Shield, UserPlus, Monitor, Wifi, WifiOff, Loader2, ChevronDown, Pencil } from 'lucide-react';
import { update } from '@/lib/firestore';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Profile, UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { createUserWithRole, subscribePresence, type PresenceData } from '@/lib/presence';
import { navSections } from '@/lib/navigation';

export function Users() {
  const { hasRole } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState<Record<string, PresenceData>>({});

  // Modal de novo usuário
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'vendedor' as UserRole });
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<string[]>([]);

  // Modal de edição
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'vendedor' as UserRole });
  const [editPages, setEditPages] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'profiles'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Profile[];
      setProfiles(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribePresence(setPresence);
    return () => unsub();
  }, []);

  async function changeRole(id: string, role: UserRole) {
    await update('profiles', id, { role } as any);
  }

  async function toggleActive(id: string, active: boolean) {
    await update('profiles', id, { active: !active } as any);
  }

  function togglePage(path: string) {
    setSelectedPages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }

  function toggleEditPage(path: string) {
    setEditPages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }

  function toggleSection(title: string) {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setEditForm({ name: p.name || '', phone: p.phone || '', role: p.role });
    setEditPages(Array.isArray(p.pages) ? p.pages : []);
    setEditError(null);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    if (!editForm.name.trim()) {
      setEditError('Informe o nome do usuário.');
      return;
    }
    setSaving(true);
    try {
      await update('profiles', editing.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        pages: editForm.role === 'admin' ? [] : editPages,
      } as any);
      setEditing(null);
    } catch {
      setEditError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setAddError('Preencha nome, e-mail e senha.');
      return;
    }
    if (form.password.length < 6) {
      setAddError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSaving(true);
    const { error } = await createUserWithRole(
      form.email.trim(),
      form.password,
      form.name.trim(),
      form.role,
      form.phone.trim(),
      selectedPages
    );
    setSaving(false);

    if (error) {
      setAddError(error);
      return;
    }
    setShowAdd(false);
    setForm({ name: '', email: '', password: '', phone: '', role: 'vendedor' });
    setSelectedPages([]);
  }

  if (loading) return <LoadingState />;

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-primary-100 text-primary-700',
    gerente: 'bg-accent-100 text-accent-700',
    vendedor: 'bg-gray-100 text-gray-700',
    financeiro: 'bg-success-100 text-success-700',
  };

  const onlineCount = profiles.filter((p) => presence[p.id]?.online).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Usuários</h2>
          <p className="text-sm text-gray-500">
            {profiles.length} cadastrado(s) · <span className="font-medium text-success-600">{onlineCount} online</span>
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary whitespace-nowrap">
          <UserPlus className="h-4 w-4" /> Adicionar usuário
        </button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState icon={<UsersIcon className="h-16 w-16" />} title="Nenhum usuário cadastrado" description="Os usuários aparecem aqui após se cadastrarem no sistema." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            const pres = presence[p.id];
            const online = pres?.online;
            return (
              <div key={p.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                    {p.name?.charAt(0).toUpperCase() || 'U'}
                    <span
                      className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        online ? 'bg-success-500' : 'bg-gray-300'
                      }`}
                      title={online ? 'Online' : 'Offline'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gray-900">{p.name || 'Sem nome'}</p>
                    <p className="text-xs text-gray-400">{p.id === auth.currentUser?.uid ? 'Você' : 'Usuário'}</p>
                    <span className={`badge mt-1 inline-block ${p.active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {online ? (
                    <Wifi className="h-5 w-5 flex-shrink-0 text-success-500" aria-label="Online" />
                  ) : (
                    <WifiOff className="h-5 w-5 flex-shrink-0 text-gray-300" aria-label="Offline" />
                  )}
                </div>

                {/* Página atual que o usuário está acessando */}
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <Monitor className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  {online && pres?.pathLabel ? (
                    <span className="truncate text-gray-700">
                      Acessando: <span className="font-semibold text-primary-700">{pres.pathLabel}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">Offline</span>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="label">Perfil de Acesso</label>
                    {p.id === auth.currentUser?.uid ? (
                      <Badge className={roleColors[p.role]}>{ROLE_LABELS[p.role]}</Badge>
                    ) : (
                      <select className="input-field" value={p.role} onChange={(e) => changeRole(p.id, e.target.value as UserRole)}>
                        {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="flex-1 rounded-lg border border-primary-200 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-50">
                      Editar
                    </button>
                    {p.id !== auth.currentUser?.uid && (
                      <button onClick={() => toggleActive(p.id, p.active)} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${p.active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-success-100 text-success-700 hover:bg-success-200'}`}>
                        {p.active ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2"><Shield className="h-5 w-5 text-primary-600" /><h3 className="font-bold text-gray-900">Permissões por Perfil</h3></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} className="rounded-lg border border-gray-100 p-3">
              <Badge className={roleColors[role as UserRole]}>{label}</Badge>
              <p className="mt-2 text-xs text-gray-500">
                {role === 'admin' && 'Acesso total ao sistema, incluindo configurações e usuários.'}
                {role === 'gerente' && 'Gestão completa, exceto configurações do sistema.'}
                {role === 'vendedor' && 'Gestão de veículos e vendas. Sem acesso financeiro.'}
                {role === 'financeiro' && 'Acesso a módulos financeiros e relatórios.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Adicionar usuário */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Adicionar usuário">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="label">Nome completo *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: João da Silva" />
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="joao@email.com" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Senha *</label>
              <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div>
            <label className="label">Perfil de Acesso</label>
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {form.role === 'admin' ? (
            <div className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">
              O perfil <strong>Administrador</strong> tem acesso a todas as páginas automaticamente.
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Páginas com acesso</label>
                <span className="text-xs text-gray-500">{selectedPages.length} selecionada(s)</span>
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {navSections.map((section) => {
                  const selectable = section.items.filter((it) => it.path !== '/admin');
                  if (selectable.length === 0) return null;
                  const isOpen = openSections.includes(section.title);
                  const selectedInSection = selectable.filter((it) => selectedPages.includes(it.path)).length;
                  return (
                    <div key={section.title} className="overflow-hidden rounded-lg border border-gray-100">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="flex w-full items-center justify-between gap-2 bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                      >
                        <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-gray-600 uppercase">
                          {section.title}
                          {selectedInSection > 0 && (
                            <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700 normal-case">
                              {selectedInSection}
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="grid gap-1.5 border-t border-gray-100 p-2 sm:grid-cols-2">
                          {selectable.map((item) => {
                            const checked = selectedPages.includes(item.path);
                            const locked = !!item.roles && !item.roles.includes(form.role);
                            return (
                              <label
                                key={item.path}
                                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                                  locked
                                    ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                                    : checked
                                      ? 'cursor-pointer border-primary-300 bg-primary-50 text-primary-800'
                                      : 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-primary-600"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={() => togglePage(item.path)}
                                />
                                <item.icon className="h-4 w-4" />
                                <span className="flex-1">{item.label}</span>
                                {locked && <span className="text-[10px]">(restrito)</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                A página Dashboard é acessível a todos. Itens marcados como <em>(restrito)</em> exigem outro perfil.
              </p>
            </div>
          )}

          {addError && (
            <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{addError}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Criando...</>) : (<><UserPlus className="h-4 w-4" /> Criar usuário</>)}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar usuário */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar usuário">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="label">Nome completo *</label>
            <input className="input-field" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Ex.: João da Silva" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Telefone</label>
              <input className="input-field" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="label">Perfil de Acesso</label>
              <select
                className="input-field"
                value={editForm.role}
                disabled={editing?.id === auth.currentUser?.uid}
                title={editing?.id === auth.currentUser?.uid ? 'Você não pode alterar o próprio perfil.' : undefined}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
              >
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {editing?.id === auth.currentUser?.uid && (
                <p className="mt-1 text-xs text-gray-400">Você não pode alterar o próprio perfil de acesso.</p>
              )}
            </div>
          </div>

          {editForm.role === 'admin' ? (
            <div className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">
              O perfil <strong>Administrador</strong> tem acesso a todas as páginas automaticamente.
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Páginas com acesso</label>
                <span className="text-xs text-gray-500">{editPages.length} selecionada(s)</span>
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {navSections.map((section) => {
                  const selectable = section.items.filter((it) => it.path !== '/admin');
                  if (selectable.length === 0) return null;
                  const isOpen = openSections.includes(section.title);
                  const selectedInSection = selectable.filter((it) => editPages.includes(it.path)).length;
                  return (
                    <div key={section.title} className="overflow-hidden rounded-lg border border-gray-100">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="flex w-full items-center justify-between gap-2 bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                      >
                        <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-gray-600 uppercase">
                          {section.title}
                          {selectedInSection > 0 && (
                            <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700 normal-case">
                              {selectedInSection}
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="grid gap-1.5 border-t border-gray-100 p-2 sm:grid-cols-2">
                          {selectable.map((item) => {
                            const checked = editPages.includes(item.path);
                            const locked = !!item.roles && !item.roles.includes(editForm.role);
                            return (
                              <label
                                key={item.path}
                                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                                  locked
                                    ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                                    : checked
                                      ? 'cursor-pointer border-primary-300 bg-primary-50 text-primary-800'
                                      : 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-primary-600"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={() => toggleEditPage(item.path)}
                                />
                                <item.icon className="h-4 w-4" />
                                <span className="flex-1">{item.label}</span>
                                {locked && <span className="text-[10px]">(restrito)</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">O e-mail de acesso e a senha não são alterados por aqui.</p>

          {editError && (
            <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{editError}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-outline">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>) : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
