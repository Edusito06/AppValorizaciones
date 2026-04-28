'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/admin/dashboard', label: 'Panel Global', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  )},
  { href: '/admin/cuadrillas', label: 'Cuadrillas', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )},
  { href: '/admin/consolidado', label: 'Consolidado Global', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  )},
  { href: '/admin/usuarios', label: 'Supervisores', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )},
];

export default function AdminSidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
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
        <div style={{
          width:42, height:42, borderRadius:12,
          background:'linear-gradient(135deg,#7c3aed,#8b5cf6)',
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10,
          boxShadow:'0 4px 15px rgba(139,92,246,0.35)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <h2 style={{ fontWeight:800, fontSize:16, color:'#e2e8f0' }}>CIEEC Admin</h2>
        <p style={{ fontSize:11, color:'#64748b', marginTop:2 }}>Panel de Control</p>
      </div>

      <div className="sidebar-nav">
        <p className="nav-section-title">Administración</p>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} onClick={onClose}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ padding:'16px', borderTop:'1px solid rgba(139,92,246,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(109,40,217,0.3))',
            border:'1px solid rgba(139,92,246,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{userData?.nombre || 'Super Admin'}</p>
            <p style={{ fontSize:11, color:'#a78bfa' }}>Super Administrador</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width:'100%', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
          borderRadius:10, padding:'9px 14px', cursor:'pointer', color:'#f87171',
          fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, transition:'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background='rgba(239,68,68,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background='rgba(239,68,68,0.08)')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
