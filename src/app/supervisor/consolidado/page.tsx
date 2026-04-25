'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getItemsOMDelMes, getOMsDeCuadrilla, getTLsDelMes } from '@/lib/db';
import { ItemOM, OrdenMantenimiento, TrabajoLibre } from '@/types';
import toast from 'react-hot-toast';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function ConsolidadoPage() {
  const { userData } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [items, setItems] = useState<ItemOM[]>([]);
  const [oms, setOMs] = useState<OrdenMantenimiento[]>([]);
  const [tls, setTLs] = useState<TrabajoLibre[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    if (!userData?.cuadrillaId) return;
    setLoading(true);
    try {
      const [itemsData, omsData, tlsData] = await Promise.all([
        getItemsOMDelMes(userData.cuadrillaId, mes, anio),
        getOMsDeCuadrilla(userData.cuadrillaId),
        getTLsDelMes(userData.cuadrillaId, mes, anio),
      ]);
      setItems(itemsData);
      setOMs(omsData);
      setTLs(tlsData);
    } finally { setLoading(false); }
  };

  const exportarExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`${MESES[mes - 1]} ${anio}`);

      ws.mergeCells('A1:G1');
      ws.getCell('A1').value = `CIEEC — Consolidado de Valorizaciones`;
      ws.getCell('A1').font = { bold: true, size: 14 };

      ws.mergeCells('A2:G2');
      ws.getCell('A2').value = `Cuadrilla: ${userData?.cuadrillaNombre} | Período: ${MESES[mes - 1]} ${anio}`;
      ws.getCell('A2').font = { size: 11, color: { argb: 'FF64748B' } };

      ws.addRow([]);

      const headerRow = ws.addRow(['OM', 'Código', 'Descripción', 'Unidad', 'Cantidad', 'P.U. (S/)', 'Subtotal (S/)', 'Fecha']);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      for (const [omId, omItems] of Object.entries(itemsByOM)) {
        const om = omMap[omId];
        for (const item of omItems) {
          ws.addRow([
            `OM ${om?.numero_om || omId}`,
            item.codigo,
            item.descripcion,
            item.unidad,
            item.cantidad,
            item.precio_unitario,
            item.subtotal,
            item.fecha_ejecucion,
          ]);
        }
      }

      const tlsSinOM = tls.filter(t => t.estado !== 'afiliado');
      if (tlsSinOM.length > 0) {
        ws.addRow([]);
        const tlHeader = ws.addRow(['SIN OM', '', 'Descripción', '', '', '', 'Total (S/)', 'Fecha']);
        tlHeader.font = { bold: true };
        tlHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
        for (const tl of tlsSinOM) {
          ws.addRow(['Sin OM', '', tl.descripcion, '', '', '', tl.total_valorizado, tl.fecha]);
        }
      }

      ws.addRow([]);
      const totalRow = ws.addRow(['', '', '', '', '', 'TOTAL GENERAL', totalGeneral, '']);
      totalRow.font = { bold: true, size: 12 };

      ws.columns = [
        { width: 18 }, { width: 12 }, { width: 40 }, { width: 10 },
        { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 },
      ];

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Consolidado_${userData?.cuadrillaNombre}_${MESES[mes - 1]}_${anio}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel exportado');
    } catch { toast.error('Error al exportar'); }
  };

  useEffect(() => { cargar(); }, [mes, anio, userData]);

  // Group items by OM
  const itemsByOM: Record<string, ItemOM[]> = {};
  items.forEach(item => {
    if (!itemsByOM[item.orden_id]) itemsByOM[item.orden_id] = [];
    itemsByOM[item.orden_id].push(item);
  });

  const omMap: Record<string, OrdenMantenimiento> = {};
  oms.forEach(o => { omMap[o.id] = o; });

  const totalOMs = items.reduce((s, i) => s + i.subtotal, 0);
  const totalTLs = tls.filter(t => t.estado !== 'afiliado').reduce((s, t) => s + t.total_valorizado, 0);
  const totalGeneral = totalOMs + totalTLs;

  return (
    <div className="page-content fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:4 }}>Consolidado Mensual</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Cuadrilla: {userData?.cuadrillaNombre}</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <select className="input-field" value={mes} onChange={e => setMes(Number(e.target.value))} style={{ width:'auto' }}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="input-field" value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ width:'auto' }}>
            {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {(items.length > 0 || tls.length > 0) && (
            <button onClick={exportarExcel} className="btn-secondary" style={{ whiteSpace:'nowrap' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* Resumen totales */}
      <div className="stats-grid" style={{ marginBottom:28 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-value money">{formatMoney(totalGeneral)}</div>
          <div className="stat-label">Total {MESES[mes-1]} {anio}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          </div>
          <div className="stat-value" style={{ color:'#60a5fa' }}>{Object.keys(itemsByOM).length}</div>
          <div className="stat-label">Órdenes con actividad</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M9 11l3 3L22 4"/></svg>
          </div>
          <div className="stat-value" style={{ color:'#f59e0b' }}>{tls.filter(t => t.estado !== 'afiliado').length}</div>
          <div className="stat-label">Trabajos libres sin afiliar</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div className="stat-value" style={{ color:'#a78bfa' }}>{items.length}</div>
          <div className="stat-label">Partidas registradas</div>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="loading-spinner" style={{width:32,height:32,margin:'0 auto'}}/></div>
      ) : (
        <>
          {/* OMs del mes */}
          {Object.keys(itemsByOM).length > 0 && (
            <div style={{ marginBottom:28 }}>
              <h2 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                Órdenes de Mantenimiento
              </h2>
              {Object.entries(itemsByOM).map(([omId, omItems]) => {
                const om = omMap[omId];
                const subtotal = omItems.reduce((s, i) => s + i.subtotal, 0);
                return (
                  <div key={omId} className="card-gradient" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
                    <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(59,130,246,0.15)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontFamily:'monospace', fontWeight:800, color:'#60a5fa', fontSize:14 }}>OM {om?.numero_om || omId}</span>
                        {om && <span style={{ fontSize:13, color:'#94a3b8', marginLeft:12 }}>{om.descripcion}</span>}
                      </div>
                      <span className="money" style={{ fontSize:16 }}>{formatMoney(subtotal)}</span>
                    </div>
                    <table className="data-table">
                      <thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th>Cantidad</th><th>P.U.</th><th>Subtotal</th><th>Fecha</th></tr></thead>
                      <tbody>
                        {omItems.map(item => (
                          <tr key={item.id}>
                            <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#60a5fa', fontSize:12 }}>{item.codigo}</span></td>
                            <td style={{ fontSize:12, color:'#94a3b8' }}>
                              <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{item.descripcion}</div>
                              {item.fotoUrl && (
                                <div style={{ marginTop:2 }}>
                                  <a href={item.fotoUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    Ver Foto
                                  </a>
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize:12, color:'#64748b' }}>{item.unidad}</td>
                            <td style={{ fontWeight:700 }}>{item.cantidad}</td>
                            <td style={{ color:'#94a3b8', fontSize:12 }}>S/{item.precio_unitario}</td>
                            <td className="money">{formatMoney(item.subtotal)}</td>
                            <td style={{ color:'#64748b', fontSize:12 }}>{item.fecha_ejecucion}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr><td colSpan={5} style={{ padding:'12px 14px', fontWeight:700, color:'#94a3b8', fontSize:12 }}>SUBTOTAL OM</td>
                        <td className="money" style={{ fontWeight:800, padding:'12px 14px' }}>{formatMoney(subtotal)}</td><td/></tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trabajos libres del mes */}
          {tls.filter(t => t.estado !== 'afiliado').length > 0 && (
            <div>
              <h2 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M9 11l3 3L22 4"/></svg>
                Trabajos Libres (Sin OM asignada)
              </h2>
              {tls.filter(t => t.estado !== 'afiliado').map(tl => (
                <div key={tl.id} className="card-gradient" style={{ padding:16, marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontWeight:700, color:'#e2e8f0', marginBottom:4 }}>{tl.descripcion}</p>
                    <p style={{ fontSize:13, color:'#64748b' }}>{tl.fecha}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p className="money">{formatMoney(tl.total_valorizado)}</p>
                    <span className="badge badge-amber" style={{ marginTop:4 }}>🟡 Sin OM</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total bar */}
          {(items.length > 0 || tls.length > 0) && (
            <div style={{ marginTop:24, padding:'20px 24px', background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.05))', border:'1px solid rgba(16,185,129,0.3)', borderRadius:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontWeight:700, color:'#94a3b8', fontSize:14, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  TOTAL VALORIZADO {MESES[mes-1].toUpperCase()} {anio}
                </p>
                <p style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{userData?.cuadrillaNombre} · {userData?.provincia}</p>
              </div>
              <p className="money" style={{ fontSize:36, fontWeight:900 }}>{formatMoney(totalGeneral)}</p>
            </div>
          )}

          {items.length === 0 && tls.length === 0 && (
            <div className="empty-state card-gradient" style={{ padding:60 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <p style={{ fontSize:16, fontWeight:600, marginTop:8 }}>Sin actividad en {MESES[mes-1]} {anio}</p>
              <p style={{ fontSize:13, marginTop:4 }}>No hay partidas registradas en este período</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
