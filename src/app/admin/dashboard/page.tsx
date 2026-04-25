'use client';
import { useEffect, useState } from 'react';
import { subscribeCuadrillas, subscribeTodasOMs, subscribeTodosLosTLs, getActividadResumenGlobal } from '@/lib/db';
import { Cuadrilla, OrdenMantenimiento, TrabajoLibre } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

interface CuadrillaStatus extends Cuadrilla {
  actividadHoy: number;
  diasSinActividad: number;
  nivel: 'ok' | 'warning' | 'danger';
  totalMes: number;
}

const PROVINCIAS = ['Tarma', 'Huancayo', 'Junín', 'Chanchamayo'];

export default function AdminDashboard() {
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [statuses, setStatuses] = useState<CuadrillaStatus[]>([]);
  const [oms, setOMs] = useState<OrdenMantenimiento[]>([]);
  const [tls, setTLs] = useState<TrabajoLibre[]>([]);
  const [loading, setLoading] = useState(true);

  const hoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });
  const hoyStr = new Date().toISOString().split('T')[0];
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();

  useEffect(() => {
    const unsub1 = subscribeCuadrillas(async (cuads) => {
      setCuadrillas(cuads);
      // 1 query global en vez de N queries (una por cuadrilla)
      const resumen = await getActividadResumenGlobal();
      const hoyDate = new Date();
      const statuses = cuads.map(c => {
        const act = resumen[c.id] || { hoy: 0, ultimaFecha: null };
        const diasSinActividad = act.ultimaFecha
          ? differenceInDays(hoyDate, new Date(act.ultimaFecha + 'T00:00:00'))
          : 999;
        const nivel: 'ok' | 'warning' | 'danger' =
          act.hoy > 0 ? 'ok' : diasSinActividad >= 2 ? 'danger' : 'warning';
        return { ...c, actividadHoy: act.hoy, diasSinActividad, nivel, totalMes: 0 } as CuadrillaStatus;
      });
      setStatuses(statuses);
      setLoading(false);
    });
    const unsub2 = subscribeTodasOMs(setOMs);
    const unsub3 = subscribeTodosLosTLs(setTLs);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const alertas = statuses.filter(s => s.nivel !== 'ok');
  const cuadrillasOK = statuses.filter(s => s.nivel === 'ok').length;
  const totalOMsMes = oms.reduce((s, o) => s + (o.total_valorizado || 0), 0);
  const tlsPendientes = tls.filter(t => t.estado === 'pendiente').length;

  const porProvincia = PROVINCIAS.map(prov => {
    const cuads = statuses.filter(c => c.provincia === prov);
    return { prov, cuads, total: 0 };
  }).filter(p => p.cuads.length > 0);

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#e2e8f0', marginBottom:4 }}>Panel de Control Global</h1>
        <p style={{ color:'#64748b', fontSize:14, textTransform:'capitalize' }}>{hoy}</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:28 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-value money" style={{ fontSize:22 }}>{formatMoney(totalOMsMes)}</div>
          <div className="stat-label">Valorizado este mes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="stat-value" style={{ color:'#60a5fa' }}>{cuadrillas.length}</div>
          <div className="stat-label">Cuadrillas activas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:`rgba(${alertas.length > 0 ? '239,68,68' : '16,185,129'},0.12)`, border:`1px solid rgba(${alertas.length > 0 ? '239,68,68' : '16,185,129'},0.2)` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={alertas.length > 0 ? '#f87171' : '#10b981'} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div className="stat-value" style={{ color: alertas.length > 0 ? '#f87171' : '#10b981' }}>{alertas.length}</div>
          <div className="stat-label">Alertas activas hoy</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </div>
          <div className="stat-value" style={{ color:'#f59e0b' }}>{tlsPendientes}</div>
          <div className="stat-label">Trab. libres sin OM</div>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <h2 className="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Alertas de Hoy
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {alertas.map(s => (
              <div key={s.id} className={`alert-bar ${s.nivel === 'danger' ? 'alert-danger' : 'alert-warning'}`}>
                <span style={{ fontSize:20 }}>{s.nivel === 'danger' ? '🔴' : '🟡'}</span>
                <div style={{ flex:1 }}>
                  <b>{s.nombre}</b> — {s.provincia}
                  <span style={{ marginLeft:8, fontSize:13, opacity:0.8 }}>
                    {s.actividadHoy === 0 ? 'Sin actividad registrada hoy' : `Solo ${s.actividadHoy} partida(s) hoy`}
                  </span>
                </div>
                <Link href={`/admin/cuadrillas?id=${s.id}`} style={{ color:'inherit', fontSize:13, opacity:0.8 }}>Ver →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Por provincia */}
      <div style={{ marginBottom:28 }}>
        <h2 className="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Estado por Provincia
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="card-gradient" style={{ padding:24, height:140 }}><div className="loading-spinner" style={{margin:'0 auto'}}/></div>)
          ) : (
            porProvincia.map(({ prov, cuads }) => (
              <div key={prov} className="card-gradient" style={{ padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <h3 style={{ fontWeight:700, color:'#e2e8f0', fontSize:15 }}>{prov}</h3>
                  <span style={{ fontSize:12, color:'#64748b' }}>{cuads.length} cuadrilla(s)</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {cuads.map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:16 }}>{c.nivel === 'ok' ? '🟢' : c.nivel === 'danger' ? '🔴' : '🟡'}</span>
                        <div>
                          <p style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{c.nombre}</p>
                          <p style={{ fontSize:11, color:'#64748b' }}>{c.supervisorNombre}</p>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:11, color: c.actividadHoy > 0 ? '#34d399' : '#f87171', fontWeight:600 }}>
                          {c.actividadHoy > 0 ? `✓ ${c.actividadHoy} items hoy` : '✗ Sin actividad'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* OMs recientes globales */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <h2 className="section-title" style={{ marginBottom:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            Órdenes Recientes (Global)
          </h2>
          <Link href="/admin/consolidado" style={{ fontSize:12, color:'#60a5fa' }}>Ver consolidado completo →</Link>
        </div>
        <div className="card-gradient" style={{ padding:0, overflow:'hidden' }}>
          {oms.length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}><p>No hay órdenes registradas aún</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Nº OM</th><th>Descripción</th><th>Zona</th><th>Cuadrillas</th><th>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {oms.slice(0, 10).map(om => (
                  <tr key={om.id}>
                    <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#60a5fa', fontSize:13 }}>{om.numero_om}</span></td>
                    <td style={{ fontSize:13, color:'#94a3b8', maxWidth:200 }}><div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{om.descripcion}</div></td>
                    <td style={{ color:'#64748b', fontSize:12 }}>{om.zona}</td>
                    <td style={{ fontSize:12, color:'#64748b' }}>{om.cuadrillas_ids?.length} cuadrilla(s)</td>
                    <td className="money">{formatMoney(om.total_valorizado || 0)}</td>
                    <td><span className={`badge ${om.estado === 'activa' ? 'badge-green' : 'badge-gray'}`}>{om.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
