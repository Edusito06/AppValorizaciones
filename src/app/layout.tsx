import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'CIEEC — Sistema de Valorizaciones',
  description: 'Sistema de registro y valorización de actividades para cuadrillas de mantenimiento eléctrico',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0d1f3c',
                color: '#e2e8f0',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#0d1f3c' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0d1f3c' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
