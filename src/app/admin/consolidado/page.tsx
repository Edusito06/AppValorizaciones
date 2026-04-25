'use client';
import { useEffect, useState } from 'react';
import { subscribeCuadrillas, getItemsOMGlobalDelMes, getTLsGlobalDelMes } from '@/lib/db';
import { Cuadrilla, ItemOM, TrabajoLibre } from '@/types';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function AdminConsolidadoPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [data, setData] = useState<{ cuadrilla: Cuadrilla; items: ItemOM[]; tls: TrabajoLibre[]; total: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeCuadrillas(setCuadrillas);
    return unsub;
  }, []);

  useEffect(() => {
    if (cuadrillas.length === 0) return;
    setLoading(true);
    // 2 queries globales en vez de 12×2 queries por cuadrilla
    Promise.all([
      getItemsOMGlobalDelMes(mes, anio),
      getTLsGlobalDelMes(mes, anio),
    ]).then(([allItems, allTLs]) => {
      const results = cuadrillas.map(c => {
        const items = allItems.filter(i => i.cuadrilla_id === c.id);
        const tls = allTLs.filter(t => t.cuadrilla_id === c.id);
        const totalItems = items.reduce((s, i) => s + i.subtotal, 0);
        const totalTLs = tls.filter(t => t.estado !== 'afiliado').reduce((s, t) => s + t.total_valorizado, 0);
        return { cuadrilla: c, items, tls, total: totalItems + totalTLs };
      });
      setData(results.sort((a, b) => b.total - a.total));
      setLoading(false);
    });
  }, [cuadrillas, mes, anio]);

  const totalGeneral = data.reduce((s, d) => s + d.total, 0);

  // Group by province
  const porProvincia = data.reduce((acc, d) => {
    const prov = d.cuadrilla.provincia;
    if (!acc[prov]) acc[prov] = { cuadrillas: [], total: 0 };
    acc[prov].cuadrillas.push(d);
    acc[prov].total += d.total;
    return acc;
  }, {} as Record<string, { cuadrillas: typeof data; total: number }>);

  return (
    <div className="page-content fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:4 }}>Consolidado Global</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Resumen de todas las cuadrillas</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <select className="input-field" value={mes} onChange={e => setMes(Number(e.target.value))} style={{ width:'auto' }}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="input-field" value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ width:'auto' }}>
            {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Total empresa */}
      <div style={{ padding:'24px 28px', background:'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.06))', border:'1px solid rgba(16,185,129,0.3)', borderRadius:16, marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontWeight:700, color:'#94a3b8', fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em' }}>Total Empresa</p>
          <p style={{ fontSize:13, color:'#64748b', marginTop:2 }}>{MESES[mes-1]} {anio} · {cuadrillas.length} cuadrillas</p>
        </div>
        <p className="money" style={{ fontSize:40, fontWeight:900 }}>{formatMoney(totalGeneral)}</p>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="loading-spinner" style={{width:32,height:32,margin:'0 auto'}}/></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {Object.entries(porProvincia).map(([prov, { cuadrillas: cuads, total }]) => (
            <div key={prov}>
              {/* Province header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
                  <h2 style={{ fontWeight:700, color:'#e2e8f0', fontSize:16 }}>{prov}</h2>
                  <span className="badge badge-blue">{cuads.length} cuadrillas</span>
                </div>
                <span style={{ fontWeight:700, color:'#a78bfa', fontSize:16 }}>{formatMoney(total)}</span>
              </div>

              <div className="card-gradient" style={{ padding:0, overflow:'hidden', marginBottom:4 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Cuadrilla</th><th>Supervisor</th><th>Partidas OM</th><th>Trab. Libres</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {cuads.map(({ cuadrilla, items, tls, total: t }) => (
                      <tr key={cuadrilla.id}>
                        <td style={{ fontWeight:700, color:'#e2e8f0' }}>{cuadrilla.nombre}</td>
                        <td style={{ color:'#94a3b8', fontSize:13 }}>{cuadrilla.supervisorNombre}</td>
                        <td style={{ color:'#60a5fa', fontSize:13 }}>{items.length} partidas</td>
                        <td>{tls.filter(tl => tl.estado !== 'afiliado').length > 0 ?
                          <span className="badge badge-amber">{tls.filter(tl => tl.estado !== 'afiliado').length} sin OM</span> :
                          <span className="badge badge-green">OK</span>}
                        </td>
                        <td className="money" style={{ fontSize:15 }}>{formatMoney(t)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ padding:'12px 14px', fontWeight:700, color:'#94a3b8', fontSize:12 }}>SUBTOTAL {prov.toUpperCase()}</td>
                      <td className="money" style={{ fontWeight:800, fontSize:15, padding:'12px 14px' }}>{formatMoney(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
