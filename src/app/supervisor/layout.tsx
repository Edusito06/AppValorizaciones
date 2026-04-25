'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import SupervisorSidebar from '@/components/SupervisorSidebar';

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (userData && userData.rol !== 'supervisor') router.replace('/admin/dashboard');
  }, [user, userData, loading, router]);

  if (loading || !userData) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#05101f' }}>
        <div style={{textAlign:'center'}}>
          <div className="loading-spinner" style={{width:36,height:36,borderWidth:3,margin:'0 auto 16px'}}/>
          <p style={{color:'#64748b', fontSize:14}}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SupervisorSidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
