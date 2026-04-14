import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Leads from './pages/Leads';
import FormSorteio from './pages/FormSorteio';
import FormConsultor from './pages/FormConsultor';
import Templates from './pages/Templates';
import NewTemplate from './pages/NewTemplate';
import Disparar from './pages/Disparar';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public forms (no sidebar) */}
        <Route path="/form/sorteio" element={<FormSorteio />} />
        <Route path="/form/consultor" element={<FormConsultor />} />

        {/* App layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/leads" replace />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/novo" element={<NewTemplate />} />
          <Route path="/disparar" element={<Disparar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
