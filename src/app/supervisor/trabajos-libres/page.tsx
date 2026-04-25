'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeTLsDeCuadrilla, afiliarTLaOM, buscarOMPorNumero, marcarTLSinCubrir } from '@/lib/db';
import { TrabajoLibre } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

export default function TrabajosLibresPage() {
  const { userData } = useAuth();
  const [tls, setTLs] = useState<TrabajoLibre[]>([]);
  const [loading, setLoading] = useState(true);
  const [afiliarId, setAfiliarId] = useState<string | null>(null);
  const [numeroOMBuscar, setNumeroOMBuscar] = useState('');
  const [buscandoOM, setBuscandoOM] = useState(false);
  const [afiliando, setAfiliando] = useState(false);

  useEffect(() => {
    if (!userData?.cuadrillaId) return;
    const unsub = subscribeTLsDeCuadrilla(userData.cuadrillaId, data => { setTLs(data); setLoading(false); });
    return unsub;
  }, [userData]);

  const handleSinCubrir = async (tlId: string) => {
    if (!confirm('¿Marcar este trabajo como "Sin cubrir"? Indica que no será afiliado a ninguna OM.')) return;
    try {
      await marcarTLSinCubrir(tlId);
      toast.success('Trabajo marcado como sin cubrir');
    } catch { toast.error('Error al actualizar'); }
  };

  const handleAfiliar = async (tlId: string) => {
    if (!numeroOMBuscar.trim()) { toast.error('Ingresa el número de OM'); return; }
    setBuscandoOM(true);
    const om = await buscarOMPorNumero(numeroOMBuscar.trim());
    setBuscandoOM(false);
    if (!om) { toast.error(`No existe OM con número ${numeroOMBuscar}`); return; }
    if (!confirm(`¿Afiliar este trabajo a la OM ${om.numero_om}?\nSe moverán todas las partidas a esa OM.`)) return;
    setAfiliando(true);
    try {
      await afiliarTLaOM(tlId, om.id, om.numero_om);
      toast.success(`Trabajo afiliado a OM ${om.numero_om} ✓`);
      setAfiliarId(null);
      setNumeroOMBuscar('');
    } catch { toast.error('Error al afiliar'); }
    finally { setAfiliando(false); }
  };

  const pendientes = tls.filter(t => t.estado === 'pendiente');
  const afiliados = tls.filter(t => t.estado === 'afiliado');

  return (
    <div className="page-content fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:4 }}>Trabajos Libres</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Actividades sin OM asignada — afílialas cuando llegue el número</p>
        </div>
        <Link href="/supervisor/trabajos-libres/nuevo" className="btn-amber">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Trabajo Libre
        </Link>
      </div>

      {pendientes.length > 0 && (
        <div className="alert-bar alert-warning" style={{ marginBottom:20 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <b>{pendientes.length} trabajo(s)</b> esperando ser afiliados a una OM de Electrocentro.
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="loading-spinner" style={{width:32,height:32,margin:'0 auto'}}/></div>
      ) : tls.length === 0 ? (
        <div className="empty-state card-gradient" style={{ padding:60 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/></svg>
          <p style={{ fontSize:16, fontWeight:600, marginTop:8 }}>Sin trabajos libres</p>
          <p style={{ fontSize:13, marginTop:4 }}>Cuando realices trabajo sin OM, regístralo aquí</p>
          <Link href="/supervisor/trabajos-libres/nuevo" className="btn-amber" style={{ marginTop:20, display:'inline-flex' }}>Registrar trabajo libre</Link>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {tls.map(tl => (
            <div key={tl.id} className="card-gradient" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <h3 style={{ fontSize:15, fontWeight:700, color:'#e2e8f0' }}>{tl.descripcion}</h3>
                    <span className={`badge ${tl.estado === 'pendiente' ? 'badge-amber' : tl.estado === 'afiliado' ? 'badge-green' : 'badge-red'}`}>
                      {tl.estado === 'pendiente' ? '🟡 Pendiente' : tl.estado === 'afiliado' ? '✓ Afiliado' : '⚠ Sin cubrir'}
                    </span>
                  </div>
                  <p style={{ fontSize:13, color:'#64748b', marginBottom:4 }}>Fecha: {tl.fecha}</p>
                  {tl.numero_om_afiliada && (
                    <p style={{ fontSize:13, color:'#34d399' }}>
                      → Afiliado a OM <b>{tl.numero_om_afiliada}</b> el {tl.fecha_afiliacion?.split('T')[0]}
                    </p>
                  )}
                </div>
                <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                  <p className="money" style={{ fontSize:20 }}>{formatMoney(tl.total_valorizado || 0)}</p>
                  <Link href={`/supervisor/trabajos-libres/${tl.id}`} className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Ver ítems
                  </Link>
                  {tl.estado === 'pendiente' && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setAfiliarId(afiliarId === tl.id ? null : tl.id)}
                        className="btn-primary" style={{ fontSize:12, padding:'6px 14px' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Afiliar a OM
                      </button>
                      <button onClick={() => handleSinCubrir(tl.id)}
                        className="btn-danger" style={{ fontSize:12, padding:'6px 14px' }}>
                        Sin cubrir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel de afiliación */}
              {afiliarId === tl.id && (
                <div style={{ marginTop:16, padding:16, background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:12 }}>
                  <p style={{ fontSize:13, color:'#94a3b8', marginBottom:10 }}>Ingresa el número de OM de Electrocentro para afiliar este trabajo:</p>
                  <div style={{ display:'flex', gap:10 }}>
                    <input
                      className="input-field"
                      type="text"
                      value={numeroOMBuscar}
                      onChange={e => setNumeroOMBuscar(e.target.value)}
                      placeholder="Nº de OM (ej: 500623447)"
                      onKeyDown={e => e.key === 'Enter' && handleAfiliar(tl.id)}
                      style={{ fontWeight:600 }}
                    />
                    <button onClick={() => handleAfiliar(tl.id)} className="btn-primary"
                      disabled={buscandoOM || afiliando || !numeroOMBuscar.trim()}
                      style={{ whiteSpace:'nowrap' }}>
                      {(buscandoOM || afiliando) ? <div className="loading-spinner" style={{width:16,height:16}}/> : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>Afiliar</>
                      )}
                    </button>
                    <button onClick={() => { setAfiliarId(null); setNumeroOMBuscar(''); }} className="btn-secondary">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
