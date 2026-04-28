'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import SupervisorSidebar from '@/components/SupervisorSidebar';

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (userData && userData.rol !== 'supervisor') router.replace('/admin/dashboard');
  }, [user, userData, loading, router]);

  if (loading || !userData) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#05101f' }}>
        <div style={{ textAlign:'center' }}>
          <div className="loading-spinner" style={{ width:36, height:36, borderWidth:3, margin:'0 auto 16px' }}/>
          <p style={{ color:'#64748b', fontSize:14 }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <SupervisorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content" style={{ flex: 1, minWidth: 0 }}>
        {/* Topbar móvil */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>CIEEC</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
