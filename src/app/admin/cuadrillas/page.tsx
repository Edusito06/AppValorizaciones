'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscribeCuadrillas, getActividadResumenGlobal } from '@/lib/db';
import { Cuadrilla } from '@/types';

export default function AdminCuadrillasPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');
  const highlightRef = useRef<HTMLDivElement>(null);

  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [actMap, setActMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filtroProv, setFiltroProv] = useState('Todas');

  const provincias = ['Todas', ...Array.from(new Set(cuadrillas.map(c => c.provincia))).sort()];

  useEffect(() => {
    const unsub = subscribeCuadrillas(async (cuads) => {
      setCuadrillas(cuads);
      // 1 query global en vez de N queries por cuadrilla
      const resumen = await getActividadResumenGlobal();
      const map: Record<string, number> = {};
      cuads.forEach(c => { map[c.id] = resumen[c.id]?.hoy || 0; });
      setActMap(map);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Auto-scroll al card destacado cuando llega desde una alerta
  useEffect(() => {
    if (highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [loading, highlightRef.current]);

  const filtradas = cuadrillas.filter(c => filtroProv === 'Todas' || c.provincia === filtroProv);

  return (
    <div className="page-content fade-in">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:4 }}>Cuadrillas</h1>
        <p style={{ color:'#64748b', fontSize:14 }}>Estado de todas las cuadrillas del sistema</p>
      </div>

      {/* Province filter */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {provincias.map(p => (
          <button key={p} onClick={() => setFiltroProv(p)}
            className={filtroProv === p ? 'btn-primary' : 'btn-secondary'}
            style={{ padding:'9px 18px' }}>
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="loading-spinner" style={{width:32,height:32,margin:'0 auto'}}/></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {filtradas.map(c => {
            const actHoy = actMap[c.id] || 0;
            const nivel = actHoy > 0 ? 'ok' : 'warning';
            const isHighlighted = c.id === highlightId;
            return (
              <div key={c.id} ref={isHighlighted ? highlightRef : null} className="card-gradient"
                style={{ padding:20, outline: isHighlighted ? '2px solid #3b82f6' : 'none', outlineOffset: 2 }}>
                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div>
                    <h3 style={{ fontWeight:700, color:'#e2e8f0', fontSize:15, marginBottom:4 }}>{c.nombre}</h3>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
                      <span style={{ fontSize:12, color:'#64748b' }}>{c.provincia}</span>
                    </div>
                  </div>
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background: nivel === 'ok' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                    border: `1px solid ${nivel === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                  }}>
                    {nivel === 'ok' ? '🟢' : '🟡'}
                  </div>
                </div>

                {/* Supervisor */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(5,16,31,0.5)', borderRadius:10, marginBottom:14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'#94a3b8' }}>{c.supervisorNombre}</p>
                    <p style={{ fontSize:11, color:'#64748b' }}>{c.supervisorEmail}</p>
                  </div>
                </div>

                {/* Activity today */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:10, background: actHoy > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${actHoy > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  <span style={{ fontSize:13, color: actHoy > 0 ? '#34d399' : '#f87171', fontWeight:600 }}>
                    {actHoy > 0 ? `✓ ${actHoy} partidas hoy` : '✗ Sin actividad hoy'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
