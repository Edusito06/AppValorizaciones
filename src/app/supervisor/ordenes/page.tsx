'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeOMsDeCuadrilla } from '@/lib/db';
import { OrdenMantenimiento } from '@/types';
import Link from 'next/link';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

export default function OrdenesPage() {
  const { userData } = useAuth();
  const [oms, setOMs] = useState<OrdenMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!userData?.cuadrillaId) return;
    const unsub = subscribeOMsDeCuadrilla(userData.cuadrillaId, data => { setOMs(data); setLoading(false); });
    return unsub;
  }, [userData]);

  const filtradas = oms.filter(om => {
    const matchEstado = filtro === 'todas' || om.estado === filtro;
    const matchBusqueda = !busqueda || om.numero_om?.toLowerCase().includes(busqueda.toLowerCase()) || om.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  return (
    <div className="page-content fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:4 }}>Órdenes de Mantenimiento</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Cuadrilla: {userData?.cuadrillaNombre}</p>
        </div>
        <Link href="/supervisor/ordenes/nueva" className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva OM / Unirse
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <input
          className="input-field"
          type="text"
          placeholder="Buscar por Nº OM o descripción..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth:280 }}
        />
        {['todas','activa','cerrada'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={filtro === f ? 'btn-primary' : 'btn-secondary'}
            style={{ padding:'9px 18px', textTransform:'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="loading-spinner" style={{width:32,height:32,margin:'0 auto'}}/></div>
      ) : filtradas.length === 0 ? (
        <div className="empty-state card-gradient" style={{ padding:60 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          <p style={{ fontSize:16, fontWeight:600, marginTop:8 }}>No hay órdenes</p>
          <p style={{ fontSize:13, marginTop:4 }}>Crea la primera OM o únete a una existente</p>
          <Link href="/supervisor/ordenes/nueva" className="btn-primary" style={{ marginTop:20, display:'inline-flex' }}>Crear / Unirse a OM</Link>
        </div>
      ) : (
        <div className="card-gradient" style={{ padding:0, overflow:'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº OM</th>
                <th>Descripción</th>
                <th>Zona</th>
                <th>Cuadrillas</th>
                <th>Valorizado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(om => (
                <tr key={om.id}>
                  <td>
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:'#60a5fa', fontSize:13 }}>{om.numero_om}</span>
                  </td>
                  <td>
                    <span style={{ maxWidth:200, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13 }}>{om.descripcion}</span>
                  </td>
                  <td style={{ color:'#94a3b8', fontSize:13 }}>{om.zona}</td>
                  <td>
                    <span style={{ fontSize:12, color:'#64748b' }}>{om.cuadrillas_ids?.length || 1} cuadrilla(s)</span>
                  </td>
                  <td className="money">{formatMoney(om.total_valorizado || 0)}</td>
                  <td>
                    <span className={`badge ${om.estado === 'activa' ? 'badge-green' : 'badge-gray'}`}>
                      {om.estado}
                    </span>
                  </td>
                  <td>
                    <Link href={`/supervisor/ordenes/${om.id}`} className="btn-secondary" style={{ padding:'6px 14px', fontSize:12 }}>
                      Ver / Valorizar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
