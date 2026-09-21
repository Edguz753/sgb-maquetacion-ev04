import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authcontext';
import { can, ROLE_COLORS, ROLE_LABELS, iniciales } from '../lib/utils';
import { MODO_DEMO } from '../lib/demo-api';
import { IconAlert, IconBarChart2, IconBook, IconCalendarPlus, IconClipboard, IconFile, IconGauge, IconHeart, IconHeartPulse, IconLink, IconLogout, IconMenu, IconSettings, IconUserCog, IconUserPlus, IconUsers, IconX } from './icons';
import { Badge, Button, Modal } from './ui';
import { FormMiContrasena } from './usuario-contrasena-ui';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles?: string[];
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <IconGauge size={17} />, end: true },
  { to: '/beneficiarios', label: 'Beneficiarios', icon: <IconUsers size={17} /> },
  { to: '/preingresos', label: 'Pre-ingresos', icon: <IconCalendarPlus size={17} /> },
    { to: '/egresados', label: 'Egresados', icon: <IconUsers size={17} /> },
  { to: '/beneficiarios/nuevo', label: 'Registro', icon: <IconUserPlus size={17} />, roles: ['GESTOR', 'COORDINADOR', 'SECRETARIA'] },
  { to: '/actividades', label: 'Actividades', icon: <IconClipboard size={17} /> },
  { to: '/documentos', label: 'Documentos', icon: <IconFile size={17} /> },
  { to: '/controles', label: 'Controles', icon: <IconHeartPulse size={17} /> },
  { to: '/nutricion', label: 'Nutrición', icon: <IconHeart size={17} /> },
  { to: '/redes', label: 'Redes', icon: <IconLink size={17} /> },
  { to: '/escolaridad', label: 'Escolaridad', icon: <IconBook size={17} /> },
  { to: '/alertas', label: 'Alertas', icon: <IconAlert size={17} /> },
  { to: '/reportes', label: 'Reportes', icon: <IconBarChart2 size={17} /> },
  { to: '/usuarios', label: 'Usuarios', icon: <IconUserCog size={17} />, roles: ['ADMIN'] },
  { to: '/auditoria', label: 'Auditoría', icon: <IconClipboard size={17} />, roles: ['ADMIN'] },
  { to: '/atenciones', label: 'Atenciones', icon: <IconCalendarPlus size={17} /> },
  { to: '/catalogos', label: 'Catálogos', icon: <IconSettings size={17} />, roles: ['ADMIN', 'GESTOR', 'COORDINADOR'] },
  { to: '/carga', label: 'Carga operativa', icon: <IconGauge size={17} />, roles: ['ADMIN', 'GESTOR', 'COORDINADOR', 'SECRETARIA'] },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [miContrasenaAbierta, setMiContrasenaAbierta] = useState(false);

  if (!usuario) return null;

  const items = NAV.filter((n) => !n.roles || n.roles.includes(usuario.rol));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = (
    <nav className="flex flex-col gap-1 overflow-x-auto p-3 md:flex-1 lg:gap-1.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-teal-800/80 text-white' : 'text-teal-100/80 hover:bg-teal-800/50 hover:text-white'
            }`
          }
        >
          {item.icon}
          <span className="whitespace-nowrap">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {MODO_DEMO && (
        <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
          Modo demostración — datos ficticios · Evidencia GA5-220501095-AA1-EV04 (maquetación web)
        </div>
      )}
      {/* Barra lateral — escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-teal-900 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <img src="logo-card.png" alt="SGB" className="h-11 w-auto rounded-lg bg-white p-0.5 shadow-sm" />
          <div>
            <p className="text-sm font-semibold text-white">SGB</p>
            <p className="text-[11px] text-teal-200/70">Gestión de Beneficiarios</p>
          </div>
        </div>
        {NavContent}
        <div className="border-t border-teal-800/60 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
              {iniciales(usuario.nombreCompleto)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{usuario.nombreCompleto}</p>
              <Badge tone={ROLE_COLORS[usuario.rol] ?? 'slate'}>{ROLE_LABELS[usuario.rol] ?? usuario.rol}</Badge>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión" className="rounded-md p-1.5 text-teal-200 hover:bg-teal-800/60 hover:text-white">
              <IconLogout size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barra superior + menú móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-teal-900 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <img src="logo-card.png" alt="SGB" className="h-8 w-auto rounded-md bg-white p-0.5" />
          <p className="text-sm font-semibold text-white">SGB</p>
        </div>
        <button onClick={() => setMenuOpen((v) => !v)} className="rounded-md p-1.5 text-white" aria-label="Menú">
          {menuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
        </button>
      </header>
      {menuOpen && (
        <div className="z-40 bg-teal-900 md:hidden">
          {NavContent}
          <div className="flex items-center justify-between border-t border-teal-800/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
                {iniciales(usuario.nombreCompleto)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{usuario.nombreCompleto}</p>
                <Badge tone={ROLE_COLORS[usuario.rol] ?? 'slate'}>{ROLE_LABELS[usuario.rol] ?? usuario.rol}</Badge>
              </div>
            </div>
            <button onClick={handleLogout} className="rounded-md p-2 text-teal-200 hover:bg-teal-800/60 hover:text-white" title="Cerrar sesión">
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <main className="px-4 py-6 md:ml-60 md:px-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
