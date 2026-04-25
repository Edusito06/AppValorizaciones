'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeItemsOM, agregarItemOM, eliminarItemOM, cerrarOM, getPartidas } from '@/lib/db';
import { uploadFotoPartida } from '@/lib/storage';
import { OrdenMantenimiento, ItemOM, Partida } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

const CATEGORIAS: Record<string, string> = { AP: 'Alumbrado Público', BT: 'Baja Tensión', MT: 'Media Tensión', SED: 'Subestaciones' };

export default function OMDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const router = useRouter();

  const [om, setOM] = useState<OrdenMantenimiento | null>(null);
  const [items, setItems] = useState<ItemOM[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Form state
  const [busquedaPartida, setBusquedaPartida] = useState('');
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<Partida | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [fechaEjecucion, setFechaEjecucion] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'ordenes_mantenimiento', id)),
      getPartidas(),
    ]).then(([omSnap, partidasData]) => {
      if (omSnap.exists()) setOM({ id: omSnap.id, ...omSnap.data() } as OrdenMantenimiento);
      setPartidas(partidasData);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!userData?.cuadrillaId) return;
    const unsub = subscribeItemsOM(id, userData.cuadrillaId, setItems);
    return unsub;
  }, [id, userData]);

  const partidasFiltradas = partidas.filter(p =>
    busquedaPartida.length >= 2 && (
      p.codigo.toLowerCase().includes(busquedaPartida.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busquedaPartida.toLowerCase())
    )
  ).slice(0, 8);

  const subtotalCuadrilla = items.reduce((s, i) => s + i.subtotal, 0);

  const handleAgregarItem = async () => {
    if (!partidaSeleccionada) { toast.error('Selecciona una partida'); return; }
    if (!cantidad || parseFloat(cantidad) <= 0) { toast.error('Ingresa una cantidad válida'); return; }
    if (!userData) return;

    setGuardando(true);
    try {
      const cant = parseFloat(cantidad);
      if (isNaN(cant) || cant <= 0) { toast.error('Ingresa una cantidad válida'); setGuardando(false); return; }
      let fotoUrl = undefined;
      if (foto) {
        fotoUrl = await uploadFotoPartida(foto, `om_${id}`);
      }

      await agregarItemOM({
        orden_id: id,
        cuadrilla_id: userData.cuadrillaId!,
        cuadrilla_nombre: userData.cuadrillaNombre!,
        supervisor_id: userData.uid,
        supervisor_nombre: userData.nombre,
        partida_id: partidaSeleccionada.id,
        codigo: partidaSeleccionada.codigo,
        descripcion: partidaSeleccionada.descripcion,
        unidad: partidaSeleccionada.unidad,
        categoria: partidaSeleccionada.categoria,
        cantidad: cant,
        precio_unitario: partidaSeleccionada.precio_unitario,
        subtotal: cant * partidaSeleccionada.precio_unitario,
        fecha_ejecucion: fechaEjecucion,
        observaciones,
        ...(fotoUrl ? { fotoUrl } : {}),
      });
      toast.success('Partida registrada ✓');
      setPartidaSeleccionada(null);
      setBusquedaPartida('');
      setCantidad('');
      setObservaciones('');
      setFoto(null);
    } catch {
      toast.error('Error al registrar partida');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (item: ItemOM) => {
    if (!confirm(`¿Eliminar ${item.codigo} — ${item.cantidad} ${item.unidad}?`)) return;
    try {
      await eliminarItemOM(item.id, id, item.subtotal);
      toast.success('Partida eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  const handleCerrarOM = async () => {
    if (!confirm('¿Cerrar esta OM? Ya no podrás agregar más partidas.')) return;
    await cerrarOM(id);
    toast.success('OM cerrada');
    router.push('/supervisor/ordenes');
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',minHeight:400}}><div className="loading-spinner" style={{width:32,height:32}}/></div>;
  if (!om) return <div className="page-content"><p style={{color:'#ef4444'}}>OM no encontrada</p></div>;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/supervisor/ordenes" style={{ color:'#64748b', fontSize:14, display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, textDecoration:'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Volver a Órdenes
        </Link>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
              <h1 style={{ fontSize:24, fontWeight:800, color:'#e2e8f0' }}>OM {om.numero_om}</h1>
              <span className={`badge ${om.estado === 'activa' ? 'badge-green' : 'badge-gray'}`}>{om.estado}</span>
            </div>
            <p style={{ color:'#94a3b8', fontSize:14 }}>{om.descripcion}</p>
            <p style={{ color:'#64748b', fontSize:12, marginTop:4 }}>
              Zona: {om.zona} · Emitida: {om.fecha_emision} · Cuadrillas: {om.cuadrillas_nombres?.join(', ')}
            </p>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {om.estado === 'activa' && (
              <button onClick={handleCerrarOM} className="btn-danger">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                Cerrar OM
              </button>
            )}
          </div>
        </div>

        {/* Totales */}
        <div style={{ display:'flex', gap:14, marginTop:16, flexWrap:'wrap' }}>
          <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, padding:'12px 18px' }}>
            <p style={{ fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Mi cuadrilla</p>
            <p className="money" style={{ fontSize:22, fontWeight:800 }}>{formatMoney(subtotalCuadrilla)}</p>
          </div>
          <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:10, padding:'12px 18px' }}>
            <p style={{ fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Total OM</p>
            <p style={{ fontSize:22, fontWeight:800, color:'#60a5fa' }}>{formatMoney(om.total_valorizado || 0)}</p>
          </div>
          <div style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, padding:'12px 18px' }}>
            <p style={{ fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Partidas registradas</p>
            <p style={{ fontSize:22, fontWeight:800, color:'#a78bfa' }}>{items.length}</p>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:20, alignItems:'start' }}>
        {/* Form agregar partida */}
        {om.estado === 'activa' && (
          <div className="card-gradient" style={{ padding:24, position:'sticky', top:90 }}>
            <h3 className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar Partida
            </h3>

            {/* Buscador partida */}
            <div style={{ marginBottom:16, position:'relative' }} ref={dropdownRef}>
              <label className="label">Buscar Partida</label>
              <input
                id="buscar-partida"
                className="input-field"
                type="text"
                value={partidaSeleccionada ? `${partidaSeleccionada.codigo} — ${partidaSeleccionada.descripcion}` : busquedaPartida}
                onChange={e => { setBusquedaPartida(e.target.value); setPartidaSeleccionada(null); setMostrarDropdown(true); }}
                onFocus={() => setMostrarDropdown(true)}
                placeholder="Código (AP-001) o nombre..."
              />
              {partidaSeleccionada && (
                <button onClick={() => { setPartidaSeleccionada(null); setBusquedaPartida(''); }}
                  style={{ position:'absolute', right:10, top:32, background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:4 }}>✕</button>
              )}
              {mostrarDropdown && partidasFiltradas.length > 0 && !partidaSeleccionada && (
                <div style={{
                  position:'absolute', top:'100%', left:0, right:0, zIndex:100,
                  background:'#0d1f3c', border:'1px solid rgba(59,130,246,0.3)', borderRadius:10,
                  boxShadow:'0 12px 30px rgba(0,0,0,0.5)', maxHeight:280, overflowY:'auto', marginTop:4,
                }}>
                  {partidasFiltradas.map(p => (
                    <div key={p.id} onClick={() => { setPartidaSeleccionada(p); setBusquedaPartida(''); setMostrarDropdown(false); }}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(59,130,246,0.08)', transition:'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <span style={{ fontFamily:'monospace', fontWeight:700, color:'#60a5fa', fontSize:12 }}>{p.codigo}</span>
                          <span className={`badge badge-${p.categoria === 'AP' ? 'amber' : p.categoria === 'MT' ? 'blue' : p.categoria === 'SED' ? 'red' : 'green'}`} style={{ marginLeft:8, fontSize:10 }}>{p.categoria}</span>
                          <p style={{ fontSize:12, color:'#94a3b8', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{p.descripcion}</p>
                        </div>
                        <span style={{ fontSize:13, color:'#34d399', fontWeight:700, whiteSpace:'nowrap', marginLeft:8 }}>S/{p.precio_unitario}/{p.unidad}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price preview */}
            {partidaSeleccionada && (
              <div style={{ marginBottom:16, padding:12, background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span style={{ color:'#94a3b8' }}>P.U.:</span>
                  <span style={{ color:'#60a5fa', fontWeight:700 }}>S/ {partidaSeleccionada.precio_unitario} / {partidaSeleccionada.unidad}</span>
                </div>
                {cantidad && parseFloat(cantidad) > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginTop:6 }}>
                    <span style={{ color:'#94a3b8' }}>Subtotal:</span>
                    <span className="money" style={{ fontSize:16 }}>{formatMoney(parseFloat(cantidad) * partidaSeleccionada.precio_unitario)}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label className="label">Cantidad *</label>
                <input id="cantidad-item" className="input-field" type="number" min="0.01" step="0.01"
                  value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Fecha Ejecución</label>
                <input id="fecha-item" className="input-field" type="date"
                  value={fechaEjecucion} onChange={e => setFechaEjecucion(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="label">Observaciones (opcional)</label>
              <textarea id="obs-item" className="input-field" rows={2}
                value={observaciones} onChange={e => setObservaciones(e.target.value)}
                placeholder="Notas adicionales..." style={{ resize:'vertical' }}/>
            </div>
            <div style={{ marginBottom:18 }}>
              <label className="label">Evidencia Fotográfica (opcional)</label>
              <input id="foto-item" className="input-field" type="file" accept="image/*"
                onChange={e => setFoto(e.target.files?.[0] || null)}
                style={{ padding: '8px 12px' }}/>
            </div>

            <button id="btn-agregar-item" onClick={handleAgregarItem} className="btn-primary"
              disabled={guardando || !partidaSeleccionada || !cantidad}
              style={{ width:'100%', justifyContent:'center', padding:'13px' }}>
              {guardando ? <><div className="loading-spinner" style={{width:18,height:18}}/>Guardando...</> : (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Registrar Partida</>
              )}
            </button>
          </div>
        )}

        {/* Items list */}
        <div>
          <h3 className="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M9 11l3 3L22 4"/></svg>
            Partidas Registradas — Mi Cuadrilla
          </h3>
          {items.length === 0 ? (
            <div className="card-gradient empty-state" style={{ padding:40 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" ry="1"/></svg>
              <p style={{ fontSize:14, marginTop:8 }}>Sin partidas registradas aún</p>
            </div>
          ) : (
            <div className="card-gradient" style={{ padding:0, overflow:'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cant.</th>
                    <th>P.U.</th>
                    <th>Subtotal</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span style={{ fontFamily:'monospace', fontWeight:700, color:'#60a5fa', fontSize:12 }}>{item.codigo}</span>
                        <br/>
                        <span className={`badge badge-${item.categoria === 'AP' ? 'amber' : item.categoria === 'MT' ? 'blue' : item.categoria === 'SED' ? 'red' : 'green'}`} style={{ fontSize:10 }}>{item.categoria}</span>
                      </td>
                      <td style={{ fontSize:12, color:'#94a3b8', maxWidth:160 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.descripcion}</div>
                        {item.observaciones && <div style={{ color:'#64748b', fontSize:11, marginTop:2 }}>{item.observaciones}</div>}
                        {item.fotoUrl && (
                          <div style={{ marginTop:4 }}>
                            <a href={item.fotoUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              Ver Foto
                            </a>
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight:700 }}>{item.cantidad} <span style={{ color:'#64748b', fontSize:11 }}>{item.unidad}</span></td>
                      <td style={{ color:'#94a3b8', fontSize:12 }}>S/{item.precio_unitario}</td>
                      <td className="money">{formatMoney(item.subtotal)}</td>
                      <td style={{ color:'#64748b', fontSize:12 }}>{item.fecha_ejecucion}</td>
                      <td>
                        {om.estado === 'activa' && (
                          <button onClick={() => handleEliminar(item)} className="btn-danger" style={{ padding:'5px 10px', fontSize:11 }}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding:'14px 14px', fontWeight:700, color:'#94a3b8', fontSize:13 }}>SUBTOTAL MI CUADRILLA</td>
                    <td className="money" style={{ fontSize:16, fontWeight:800, padding:'14px 14px' }}>{formatMoney(subtotalCuadrilla)}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
