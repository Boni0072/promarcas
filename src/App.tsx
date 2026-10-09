import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PublicHome } from '@/pages/public/PublicHome';
import { VehicleDetail as PublicVehicleDetail } from '@/pages/public/VehicleDetail';
import { Login } from '@/pages/admin/Login';
import { Dashboard } from '@/pages/admin/Dashboard';
import { VehiclesList } from '@/pages/admin/VehiclesList';
import { VehicleForm } from '@/pages/admin/VehicleForm';
import { VehicleDetail } from '@/pages/admin/VehicleDetail';
import { Stock } from '@/pages/admin/Stock';
import { Entries } from '@/pages/admin/Entries';
import { Pricing } from '@/pages/admin/Pricing';
import { Costs } from '@/pages/admin/Costs';
import { Sales } from '@/pages/admin/Sales';
import { Financial } from '@/pages/admin/Financial';
import { Expenses } from '@/pages/admin/Expenses';
import { Revenues } from '@/pages/admin/Revenues';
import { Commissions } from '@/pages/admin/Commissions';
import { Reports } from '@/pages/admin/Reports';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { Users } from '@/pages/admin/Users';
import { canAccess, resolveNavPath } from '@/lib/navigation';
import type { UserRole } from '@/types';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user, profile, hasRole } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  // Restrição por perfil (roles)
  if (roles && profile && !hasRole(...roles)) return <Navigate to="/admin" replace />;
  // Restrição por página (acesso concedido ao criar/editar o usuário)
  const navItem = resolveNavPath(location.pathname);
  if (navItem && !canAccess(profile, navItem.path, navItem.roles)) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/veiculo/:id" element={<PublicVehicleDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/veiculos" element={<ProtectedRoute><AdminLayout><VehiclesList /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/veiculos/novo" element={<ProtectedRoute><AdminLayout><VehicleForm /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/veiculos/:id" element={<ProtectedRoute><AdminLayout><VehicleDetail /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/veiculos/:id/editar" element={<ProtectedRoute><AdminLayout><VehicleForm /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/entradas" element={<ProtectedRoute><AdminLayout><Entries /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/estoque" element={<ProtectedRoute><AdminLayout><Stock /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/precos" element={<ProtectedRoute><AdminLayout><Pricing /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/custos" element={<ProtectedRoute><AdminLayout><Costs /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/vendas" element={<ProtectedRoute><AdminLayout><Sales /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/financeiro" element={<ProtectedRoute roles={['admin', 'gerente', 'financeiro']}><AdminLayout><Financial /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/despesas" element={<ProtectedRoute roles={['admin', 'gerente', 'financeiro']}><AdminLayout><Expenses /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/receitas" element={<ProtectedRoute roles={['admin', 'gerente', 'financeiro']}><AdminLayout><Revenues /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/comissoes" element={<ProtectedRoute roles={['admin', 'gerente', 'financeiro']}><AdminLayout><Commissions /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/relatorios" element={<ProtectedRoute><AdminLayout><Reports /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/configuracoes" element={<ProtectedRoute roles={['admin']}><AdminLayout><SettingsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute roles={['admin']}><AdminLayout><Users /></AdminLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
