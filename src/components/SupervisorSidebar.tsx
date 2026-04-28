'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/supervisor/dashboard', label: 'Mi Panel', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  )},
  { href: '/supervisor/ordenes', label: 'Órdenes de Mant.', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  )},
  { href: '/supervisor/ordenes/nueva', label: 'Nueva OM / Unirse', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
  )},
  { href: '/supervisor/trabajos-libres', label: 'Trabajos Libres', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  )},
  { href: '/supervisor/trabajos-libres/nuevo', label: 'Nuevo Trab. Libre', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  )},
  { href: '/supervisor/consolidado', label: 'Consolidado Mensual', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  )},
];

export default function SupervisorSidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  return (
    <nav className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 16, color: '#e2e8f0' }}>CIEEC</h2>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Sistema de Valorizaciones</p>
      </div>

      <div className="sidebar-nav">
        <p className="nav-section-title">Supervisor</p>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`nav-item ${pathname === item.href || (item.href !== '/supervisor/dashboard' && pathname.startsWith(item.href) && item.href.split('/').length > 3) ? 'active' : pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {/* User Info */}
      <div style={{ padding: '16px 16px', borderTop: '1px solid rgba(59,130,246,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.3))',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userData?.nombre || 'Supervisor'}</p>
            <p style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userData?.cuadrillaNombre || ''} — {userData?.provincia || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '9px 14px', cursor: 'pointer', color: '#f87171',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
