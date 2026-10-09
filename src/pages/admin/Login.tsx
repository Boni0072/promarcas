import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, UserPlus, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, ROLE_ORDER } from '@/lib/utils';
import type { UserRole } from '@/types';

export function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/admin');
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const { error } = await signUp(email, password, name, role);
    if (error) {
      setError(error);
      setCreating(false);
    } else {
      setEmail('');
      setPassword('');
      setName('');
      setRole('admin');
      setCreating(false);
      navigate('/admin');
    }
  }

  function toggleCreate() {
    setError(null);
    setShowCreate((v) => !v);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-primary-950 to-primary-800 p-4">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <img src="/Promarcas logo.png" alt="PRÓMARCAS MOTORS" className="h-20 w-auto" />
          </div>
          <p className="mt-1 text-sm text-gray-400">Plataforma de gestão para revenda de veículos</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Formulário de login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field pl-11" placeholder="seu@email.com" />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-field pl-11" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>

            {error && !showCreate && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
              {loading ? 'Aguarde...' : 'Entrar'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Criar usuário temporário (fora do form de login) */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={toggleCreate}
              className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              <UserPlus className="h-4 w-4" />
              Criar usuário temporário
            </button>

            {showCreate && (
              <form onSubmit={handleCreateUser} className="mt-4 space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field pl-11" placeholder="seu@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-field pl-11" placeholder="Mínimo 6 caracteres" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Nome</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-field pl-11" placeholder="Nome completo" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Perfil</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input-field pl-11">
                        {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={creating} className="btn-primary flex-1 !py-3">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Usuário'}
                  </button>
                  <button type="button" onClick={toggleCreate} className="text-sm text-gray-500 hover:text-gray-700">
                    Cancelar
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}