'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (userData && userData.rol !== 'superadmin') router.replace('/supervisor/dashboard');
  }, [user, userData, loading, router]);

  if (loading || !userData) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#05101f' }}>
        <div className="loading-spinner" style={{ width:36, height:36, borderWidth:3 }}/>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <AdminSidebar />
      <div className="main-content">{children}</div>
    </div>
  );
}
