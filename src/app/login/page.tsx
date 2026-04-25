'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, userData } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // Redirect is handled by page.tsx root which watches userData via onAuthStateChanged
      router.push('/');
    } catch (err: any) {
      const msg = err?.code === 'auth/invalid-credential'
        ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
        : 'Error al iniciar sesión. Intenta de nuevo.';
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(30,58,138,0.25) 0%, #05101f 60%), #05101f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Electric grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}/>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(59,130,246,0.4)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>CIEEC</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Sistema de Valorizaciones Eléctrico</p>
        </div>

        {/* Card */}
        <div className="card-gradient" style={{ padding: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#e2e8f0' }}>Iniciar Sesión</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 28 }}>Ingresa tus credenciales de acceso</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label className="label">Correo Electrónico</label>
              <input
                id="email"
                className="input-field"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@empresa.pe"
                required
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label className="label">Contraseña</label>
              <input
                id="password"
                className="input-field"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="btn-login"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}
            >
              {loading ? <><div className="loading-spinner" style={{width:18,height:18}}/> Ingresando...</> : (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Ingresar al Sistema</>
              )}
            </button>
          </form>

        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#374151', fontSize: 12 }}>
          CIEEC EIRL © {new Date().getFullYear()} — Sistema de Valorizaciones
        </p>
      </div>
    </div>
  );
}
