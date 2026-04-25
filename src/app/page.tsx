'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (userData?.rol === 'superadmin') router.replace('/admin/dashboard');
    else router.replace('/supervisor/dashboard');
  }, [user, userData, loading, router]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#05101f' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:56, height:56, margin:'0 auto 20px',
          background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
          borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 25px rgba(59,130,246,0.35)'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div className="loading-spinner" style={{margin:'0 auto'}}/>
      </div>
    </div>
  );
}
