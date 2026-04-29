import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Leads from './pages/Leads';
import FormSorteio from './pages/FormSorteio';
import FormConsultor from './pages/FormConsultor';
import Templates from './pages/Templates';
import NewTemplate from './pages/NewTemplate';
import Disparar from './pages/Disparar';
import Cadencias from './pages/Cadencias';
import Historico from './pages/Historico';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { supabaseMisconfigured } from './lib/supabase';

function Spinner() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function LoginPage() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/leads" replace />;
  return <Login />;
}

export default function App() {
  if (supabaseMisconfigured) {
    return (
      <div style={{ padding: 32, fontFamily: 'sans-serif', maxWidth: 500, margin: '80px auto' }}>
        <h2 style={{ color: '#dc2626' }}>Configuração incompleta</h2>
        <p>As variáveis de ambiente do Supabase não foram encontradas.</p>
        <p>Configure no Vercel (Settings → Environment Variables):</p>
        <pre style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, fontSize: 13 }}>
          VITE_SUPABASE_URL=https://xxxx.supabase.co{'\n'}
          VITE_SUPABASE_ANON_KEY=eyJ...
        </pre>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Após adicionar as variáveis, faça um novo deploy no Vercel.
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/form/sorteio" element={<FormSorteio />} />
        <Route path="/form/consultor" element={<FormConsultor />} />

        {/* Protegidas */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/leads" replace />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/novo" element={<NewTemplate />} />
            <Route path="/disparar" element={<Disparar />} />
            <Route path="/cadencias" element={<Cadencias />} />
            <Route path="/historico" element={<Historico />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
