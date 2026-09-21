import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './auth/authcontext';
import Layout from './components/layout';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import Beneficiarios from './pages/beneficiarios';
import DetalleBeneficiario from './pages/detallebeneficiario';
import RegistroBeneficiario from './pages/registrobeneficiario';
import Actividades from './pages/actividades';
import CargaOperativa from './pages/cargaoperativa';
import Documentos from './pages/documentos';
import Controles from './pages/controles';
import Nutricion from './pages/nutricion';
import Redes from './pages/redes';
import Escolaridad from './pages/escolaridad';
import Alertas from './pages/alertas';
import Reportes from './pages/reportes';
import Usuarios from './pages/usuarios';
import Auditoria from './pages/auditoria';
import Catalogos from './pages/catalogos';
import Atenciones from './pages/atenciones';
import Egresados from './pages/egresados';
import PreIngresos from './pages/preingresos';

function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="beneficiarios" element={<Beneficiarios />} />
        <Route path="beneficiarios/nuevo" element={<RegistroBeneficiario />} />
        <Route path="beneficiarios/:id" element={<DetalleBeneficiario />} />
        <Route path="/egresados" element={<Egresados />} />
        <Route path="/preingresos" element={<PreIngresos />} />
        <Route path="actividades" element={<Actividades />} />
        <Route path="carga" element={<CargaOperativa />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="controles" element={<Controles />} />
        <Route path="nutricion" element={<Nutricion />} />
        <Route path="redes" element={<Redes />} />
        <Route path="escolaridad" element={<Escolaridad />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="catalogos" element={<Catalogos />} />
        <Route path="atenciones" element={<Atenciones />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}