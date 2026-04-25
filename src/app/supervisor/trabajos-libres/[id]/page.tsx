'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getTrabajoLibre, subscribeItemsTL, agregarItemTL, eliminarItemTL, getPartidas } from '@/lib/db';
import { uploadFotoPartida } from '@/lib/storage';
import { TrabajoLibre, ItemTL, Partida } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

export default function TLDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const router = useRouter();

  const [tl, setTL] = useState<TrabajoLibre | null>(null);
  const [items, setItems] = useState<ItemTL[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [partidaSel, setPartidaSel] = useState<Partida | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [fechaItem, setFechaItem] = useState(new Date().toISOString().split('T')[0]);
  const [obs, setObs] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    Promise.all([getTrabajoLibre(id), getPartidas()]).then(([tlData, pData]) => {
      if (tlData) setTL(tlData);
      setPartidas(pData);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const unsub = subscribeItemsTL(id, setItems);
    return unsub;
  }, [id]);

  const filtradas = partidas.filter(p =>
    busqueda.length >= 2 && (
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    )
  ).slice(0, 8);

  const totalItems = items.reduce((s, i) => s + i.subtotal, 0);
  const puedeEditar = tl?.estado === 'pendiente';

  const handleAgregarItem = async () => {
    if (!partidaSel) { toast.error('Selecciona una partida'); return; }
    const cant = parseFloat(cantidad);
    if (isNaN(cant) || cant <= 0) { toast.error('Ingresa una cantidad válida'); return; }
    if (!userData) return;
    setGuardando(true);
    try {
      let fotoUrl = undefined;
      if (foto) fotoUrl = await uploadFotoPartida(foto, `tl_${id}`);
      await agregarItemTL({
        trabajo_libre_id: id,
        cuadrilla_id: userData.cuadrillaId!,
        supervisor_id: userData.uid,
        partida_id: partidaSel.id,
        codigo: partidaSel.codigo,
        descripcion: partidaSel.descripcion,
        unidad: partidaSel.unidad,
        categoria: partidaSel.categoria,
        cantidad: cant,
        precio_unitario: partidaSel.precio_unitario,
        subtotal: cant * partidaSel.precio_unitario,
        fecha_ejecucion: fechaItem,
        observaciones: obs,
        ...(fotoUrl ? { fotoUrl } : {}),
      });
      toast.success('Partida registrada ✓');
      setPartidaSel(null); setBusqueda(''); setCantidad(''); setObs(''); setFoto(null);
    } catch { toast.error('Error al registrar partida'); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async (item: ItemTL) => {
    if (!confirm(`¿Eliminar ${item.codigo} — ${item.cantidad} ${item.unidad}?`)) return;
    try {
      await eliminarItemTL(item.id, id, item.subtotal);
      toast.success('Partida eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
  if (!tl) return <div className="page-content"><p style={{ color: '#ef4444' }}>Trabajo libre no encontrado</p></div>;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/supervisor/trabajos-libres" style={{ color: '#64748b', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Volver a Trabajos Libres
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>{tl.descripcion}</h1>
              <span className={`badge ${tl.estado === 'pendiente' ? 'badge-amber' : tl.estado === 'afiliado' ? 'badge-green' : 'badge-red'}`}>
                {tl.estado === 'pendiente' ? '🟡 Pendiente' : tl.estado === 'afiliado' ? '✓ Afiliado' : '⚠ Sin cubrir'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Fecha: {tl.fecha} · {tl.cuadrilla_nombre}
              {tl.numero_om_afiliada && <span style={{ color: '#34d399', marginLeft: 10 }}>→ OM {tl.numero_om_afiliada}</span>}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="money" style={{ fontSize: 26, fontWeight: 900 }}>{formatMoney(totalItems)}</p>
            <p style={{ fontSize: 12, color: '#64748b' }}>{items.length} partida(s)</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: puedeEditar ? '1fr 1.4fr' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Form agregar (solo si pendiente) */}
        {puedeEditar && (
          <div className="card-gradient" style={{ padding: 24, position: 'sticky', top: 90 }}>
            <h3 className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Agregar Partida
            </h3>

            <div style={{ marginBottom: 14, position: 'relative' }} ref={dropdownRef}>
              <label className="label">Buscar Partida</label>
              <input
                className="input-field" type="text"
                value={partidaSel ? `${partidaSel.codigo} — ${partidaSel.descripcion}` : busqueda}
                onChange={e => { setBusqueda(e.target.value); setPartidaSel(null); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Código (AP-001) o nombre..."
              />
              {partidaSel && (
                <button onClick={() => { setPartidaSel(null); setBusqueda(''); }}
                  style={{ position: 'absolute', right: 10, top: 32, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>✕</button>
              )}
              {showDropdown && filtradas.length > 0 && !partidaSel && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0d1f3c', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', maxHeight: 280, overflowY: 'auto', marginTop: 4 }}>
                  {filtradas.map(p => (
                    <div key={p.id} onClick={() => { setPartidaSel(p); setBusqueda(''); setShowDropdown(false); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(59,130,246,0.08)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>{p.codigo}</span>
                          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.descripcion}</p>
                        </div>
                        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700, marginLeft: 8 }}>S/{p.precio_unitario}/{p.unidad}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {partidaSel && (
              <div style={{ marginBottom: 14, padding: 12, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#94a3b8' }}>P.U.:</span>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>S/ {partidaSel.precio_unitario} / {partidaSel.unidad}</span>
                </div>
                {cantidad && parseFloat(cantidad) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 6 }}>
                    <span style={{ color: '#94a3b8' }}>Subtotal:</span>
                    <span className="money" style={{ fontSize: 16 }}>{formatMoney(parseFloat(cantidad) * partidaSel.precio_unitario)}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="label">Cantidad *</label>
                <input className="input-field" type="number" min="0.01" step="0.01"
                  value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Fecha Ejecución</label>
                <input className="input-field" type="date"
                  value={fechaItem} onChange={e => setFechaItem(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Observaciones (opcional)</label>
              <textarea className="input-field" rows={2} value={obs} onChange={e => setObs(e.target.value)}
                placeholder="Notas adicionales..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="label">Evidencia Fotográfica (opcional)</label>
              <input className="input-field" type="file" accept="image/*"
                onChange={e => setFoto(e.target.files?.[0] || null)}
                style={{ padding: '8px 12px' }} />
            </div>
            <button onClick={handleAgregarItem} className="btn-primary"
              disabled={guardando || !partidaSel || !cantidad}
              style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
              {guardando ? <><div className="loading-spinner" style={{ width: 18, height: 18 }} />Guardando...</> : (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Registrar Partida</>
              )}
            </button>
          </div>
        )}

        {/* Lista de ítems */}
        <div>
          <h3 className="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M9 11l3 3L22 4" /></svg>
            Partidas Registradas
          </h3>
          {items.length === 0 ? (
            <div className="card-gradient empty-state" style={{ padding: 40 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /></svg>
              <p style={{ fontSize: 14, marginTop: 8 }}>Sin partidas registradas aún</p>
            </div>
          ) : (
            <div className="card-gradient" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cant.</th>
                    <th>P.U.</th>
                    <th>Subtotal</th>
                    <th>Fecha</th>
                    {puedeEditar && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>{item.codigo}</span>
                        <br />
                        <span className={`badge badge-${item.categoria === 'AP' ? 'amber' : item.categoria === 'MT' ? 'blue' : item.categoria === 'SED' ? 'red' : 'green'}`} style={{ fontSize: 10 }}>{item.categoria}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#94a3b8', maxWidth: 160 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</div>
                        {item.observaciones && <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{item.observaciones}</div>}
                        {item.fotoUrl && (
                          <a href={item.fotoUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontWeight: 600, marginTop: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            Ver Foto
                          </a>
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.cantidad} <span style={{ color: '#64748b', fontSize: 11 }}>{item.unidad}</span></td>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>S/{item.precio_unitario}</td>
                      <td className="money">{formatMoney(item.subtotal)}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{item.fecha_ejecucion}</td>
                      {puedeEditar && (
                        <td>
                          <button onClick={() => handleEliminar(item)} className="btn-danger" style={{ padding: '5px 10px', fontSize: 11 }}>✕</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={puedeEditar ? 4 : 4} style={{ padding: '14px', fontWeight: 700, color: '#94a3b8', fontSize: 13 }}>TOTAL</td>
                    <td className="money" style={{ fontSize: 16, fontWeight: 800, padding: '14px' }}>{formatMoney(totalItems)}</td>
                    <td colSpan={puedeEditar ? 2 : 1} />
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
