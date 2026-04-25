'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { crearTrabajoLibre, agregarItemTL, getPartidas } from '@/lib/db';
import { uploadFotoPartida } from '@/lib/storage';
import { Partida, ItemTL } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useEffect } from 'react';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

interface ItemTemp { partida: Partida; cantidad: number; fecha: string; obs: string; foto: File | null; }

export default function NuevoTLPage() {
  const { userData } = useAuth();
  const router = useRouter();

  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [items, setItems] = useState<ItemTemp[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Form item
  const [busqueda, setBusqueda] = useState('');
  const [partidaSel, setPartidaSel] = useState<Partida | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [fechaItem, setFechaItem] = useState(new Date().toISOString().split('T')[0]);
  const [obs, setObs] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => { getPartidas().then(setPartidas); }, []);

  const filtradas = partidas.filter(p =>
    busqueda.length >= 2 && (
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    )
  ).slice(0, 8);

  const totalTemp = items.reduce((s, i) => s + i.partida.precio_unitario * i.cantidad, 0);

  const agregarItemTemp = () => {
    if (!partidaSel) { toast.error('Selecciona una partida'); return; }
    if (!cantidad || parseFloat(cantidad) <= 0) { toast.error('Ingresa cantidad válida'); return; }
    setItems(prev => [...prev, { partida: partidaSel, cantidad: parseFloat(cantidad), fecha: fechaItem, obs, foto }]);
    setPartidaSel(null); setBusqueda(''); setCantidad(''); setObs(''); setFoto(null);
    toast.success('Partida agregada a la lista');
  };

  const removerItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleGuardar = async () => {
    if (!descripcion.trim()) { toast.error('Ingresa una descripción'); return; }
    if (items.length === 0) { toast.error('Agrega al menos una partida'); return; }
    if (!userData) return;
    setGuardando(true);
    try {
      const total = items.reduce((s, i) => s + i.partida.precio_unitario * i.cantidad, 0);
      const tlId = await crearTrabajoLibre({
        cuadrilla_id: userData.cuadrillaId!,
        cuadrilla_nombre: userData.cuadrillaNombre!,
        supervisor_id: userData.uid,
        supervisor_nombre: userData.nombre,
        descripcion: descripcion.trim(),
        fecha,
        estado: 'pendiente',
        total_valorizado: total,
      });
      // Add items
      for (const item of items) {
        let fotoUrl = undefined;
        if (item.foto) {
          fotoUrl = await uploadFotoPartida(item.foto, `tl_${tlId}`);
        }
        await agregarItemTL({
          trabajo_libre_id: tlId,
          cuadrilla_id: userData.cuadrillaId!,
          supervisor_id: userData.uid,
          partida_id: item.partida.id,
          codigo: item.partida.codigo,
          descripcion: item.partida.descripcion,
          unidad: item.partida.unidad,
          categoria: item.partida.categoria,
          cantidad: item.cantidad,
          precio_unitario: item.partida.precio_unitario,
          subtotal: item.cantidad * item.partida.precio_unitario,
          fecha_ejecucion: item.fecha,
          observaciones: item.obs,
          ...(fotoUrl ? { fotoUrl } : {}),
        });
      }
      toast.success('Trabajo libre registrado ✓');
      router.push('/supervisor/trabajos-libres');
    } catch { toast.error('Error al guardar'); }
    finally { setGuardando(false); }
  };

  return (
    <div className="page-content fade-in">
      <div style={{ marginBottom:24, display:'flex', alignItems:'center', gap:12 }}>
        <Link href="/supervisor/trabajos-libres" style={{ color:'#64748b', fontSize:14, display:'inline-flex', alignItems:'center', gap:6, textDecoration:'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Volver
        </Link>
        <span style={{ color:'#374151' }}>|</span>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0' }}>Nuevo Trabajo Libre</h1>
      </div>

      <div className="alert-bar alert-info" style={{ marginBottom:24 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Usa este formulario cuando ya realizaste trabajo pero aún no tienes el número de OM de Electrocentro. Podrás afiliarlo después.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:20, alignItems:'start' }}>
        {/* Form */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card-gradient" style={{ padding:24 }}>
            <h3 className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
              Datos del Trabajo
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label className="label">Descripción del Trabajo *</label>
                <input id="desc-tl" className="input-field" type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Ej: Emergencia nocturna — caída de poste en Jr. Lima" />
              </div>
              <div>
                <label className="label">Fecha del Trabajo</label>
                <input id="fecha-tl" className="input-field" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div style={{ padding:12, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:10, fontSize:13, color:'#94a3b8' }}>
                <b style={{ color:'#fbbf24' }}>Cuadrilla:</b> {userData?.cuadrillaNombre} — {userData?.nombre}
              </div>
            </div>
          </div>

          {/* Agregar partidas */}
          <div className="card-gradient" style={{ padding:24 }}>
            <h3 className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar Partidas
            </h3>

            <div style={{ marginBottom:12, position:'relative' }}>
              <label className="label">Buscar Partida</label>
              <input className="input-field" type="text"
                value={partidaSel ? `${partidaSel.codigo} — ${partidaSel.descripcion}` : busqueda}
                onChange={e => { setBusqueda(e.target.value); setPartidaSel(null); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Código o nombre..." />
              {partidaSel && <button onClick={() => { setPartidaSel(null); setBusqueda(''); }}
                style={{ position:'absolute', right:10, top:32, background:'none', border:'none', color:'#64748b', cursor:'pointer' }}>✕</button>}
              {showDropdown && filtradas.length > 0 && !partidaSel && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#0d1f3c', border:'1px solid rgba(59,130,246,0.3)', borderRadius:10, boxShadow:'0 12px 30px rgba(0,0,0,0.5)', maxHeight:220, overflowY:'auto', marginTop:4 }}>
                  {filtradas.map(p => (
                    <div key={p.id} onClick={() => { setPartidaSel(p); setBusqueda(''); setShowDropdown(false); }}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(59,130,246,0.08)' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(59,130,246,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div>
                          <span style={{ fontFamily:'monospace', fontWeight:700, color:'#60a5fa', fontSize:12 }}>{p.codigo}</span>
                          <p style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{p.descripcion.slice(0,50)}</p>
                        </div>
                        <span style={{ fontSize:12, color:'#34d399', fontWeight:700 }}>S/{p.precio_unitario}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {partidaSel && (
              <div style={{ marginBottom:10, padding:10, background:'rgba(59,130,246,0.06)', borderRadius:8, fontSize:13, color:'#94a3b8' }}>
                P.U.: <b style={{color:'#60a5fa'}}>S/ {partidaSel.precio_unitario} / {partidaSel.unidad}</b>
                {cantidad && parseFloat(cantidad) > 0 && <> · Subtotal: <b className="money">S/ {(parseFloat(cantidad)*partidaSel.precio_unitario).toFixed(2)}</b></>}
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label className="label">Cantidad</label>
                <input className="input-field" type="number" min="0.01" step="0.01" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" /></div>
              <div><label className="label">Fecha</label>
                <input className="input-field" type="date" value={fechaItem} onChange={e => setFechaItem(e.target.value)} /></div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">Observaciones</label>
              <input className="input-field" type="text" value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." />
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="label">Evidencia Fotográfica (opcional)</label>
              <input className="input-field" type="file" accept="image/*"
                onChange={e => setFoto(e.target.files?.[0] || null)}
                style={{ padding: '8px 12px' }}/>
            </div>
            <button onClick={agregarItemTemp} className="btn-secondary" style={{ width:'100%', justifyContent:'center' }} disabled={!partidaSel || !cantidad}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar a la lista
            </button>
          </div>
        </div>

        {/* Preview de items */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 className="section-title" style={{ marginBottom:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/></svg>
              Partidas a Registrar
            </h3>
            {items.length > 0 && <span className="money" style={{ fontSize:18 }}>{formatMoney(totalTemp)}</span>}
          </div>

          {items.length === 0 ? (
            <div className="card-gradient empty-state" style={{ padding:40 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/></svg>
              <p style={{ fontSize:13, marginTop:8 }}>Agrega partidas para registrar</p>
            </div>
          ) : (
            <>
              <div className="card-gradient" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
                <table className="data-table">
                  <thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#60a5fa', fontSize:12 }}>{item.partida.codigo}</span></td>
                        <td style={{ fontSize:12, color:'#94a3b8', maxWidth:150 }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.partida.descripcion}</div>
                          {item.foto && <div style={{ fontSize:11, color:'#3b82f6', marginTop:2 }}>📷 {item.foto.name}</div>}
                        </td>
                        <td style={{ fontWeight:700 }}>{item.cantidad} <span style={{ color:'#64748b', fontSize:11 }}>{item.partida.unidad}</span></td>
                        <td className="money">{formatMoney(item.cantidad * item.partida.precio_unitario)}</td>
                        <td><button onClick={() => removerItem(idx)} className="btn-danger" style={{ padding:'4px 8px', fontSize:11 }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={3} style={{ padding:'12px 14px', fontWeight:700, color:'#94a3b8', fontSize:13 }}>TOTAL</td>
                    <td className="money" style={{ fontSize:16, fontWeight:800, padding:'12px 14px' }}>{formatMoney(totalTemp)}</td><td/></tr>
                  </tfoot>
                </table>
              </div>
              <button id="btn-guardar-tl" onClick={handleGuardar} className="btn-amber"
                disabled={guardando || !descripcion.trim() || items.length === 0}
                style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15 }}>
                {guardando ? <><div className="loading-spinner" style={{width:18,height:18}}/>Guardando...</> : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>Guardar Trabajo Libre ({items.length} partidas)</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
