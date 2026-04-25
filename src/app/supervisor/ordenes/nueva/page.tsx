'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { buscarOMPorNumero, crearOM, unirseAOM } from '@/lib/db';
import { OrdenMantenimiento } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function NuevaOMPage() {
  const { userData } = useAuth();
  const router = useRouter();

  const [numeroOM, setNumeroOM] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [omEncontrada, setOMEncontrada] = useState<OrdenMantenimiento | null>(null);
  const [buscado, setBuscado] = useState(false);

  // Form crear nueva
  const [descripcion, setDescripcion] = useState('');
  const [zona, setZona] = useState(userData?.provincia || '');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [creando, setCreando] = useState(false);
  const [uniendose, setUniendose] = useState(false);

  const buscarOM = async () => {
    if (!numeroOM.trim()) { toast.error('Ingresa el número de OM'); return; }
    setBuscando(true);
    try {
      const om = await buscarOMPorNumero(numeroOM.trim());
      setOMEncontrada(om);
      setBuscado(true);
      if (om) toast.success(`OM ${om.numero_om} encontrada ✓`);
      else toast(`OM no registrada. Puedes crearla abajo.`, { icon: 'ℹ️' });
    } catch {
      toast.error('Error al buscar la OM');
    } finally {
      setBuscando(false);
    }
  };

  const unirseOM = async () => {
    if (!omEncontrada || !userData) return;
    if (omEncontrada.cuadrillas_ids?.includes(userData.cuadrillaId || '')) {
      toast('Ya estás participando en esta OM', { icon: 'ℹ️' });
      router.push(`/supervisor/ordenes/${omEncontrada.id}`);
      return;
    }
    setUniendose(true);
    try {
      await unirseAOM(omEncontrada.id, userData.cuadrillaId!, userData.cuadrillaNombre!);
      toast.success(`¡Te uniste a la OM ${omEncontrada.numero_om}!`);
      router.push(`/supervisor/ordenes/${omEncontrada.id}`);
    } catch {
      toast.error('Error al unirse a la OM');
    } finally {
      setUniendose(false);
    }
  };

  const crearNuevaOM = async () => {
    if (!descripcion.trim()) { toast.error('Ingresa una descripción'); return; }
    if (!userData) return;
    setCreando(true);
    try {
      const id = await crearOM({
        numero_om: numeroOM.trim(),
        descripcion: descripcion.trim(),
        zona: zona || userData.provincia || '',
        estado: 'activa',
        cuadrillas_ids: [userData.cuadrillaId!],
        cuadrillas_nombres: [userData.cuadrillaNombre!],
        creador_id: userData.uid,
        creador_nombre: userData.nombre,
        fecha_emision: fechaEmision,
      });
      toast.success(`OM ${numeroOM} creada exitosamente`);
      router.push(`/supervisor/ordenes/${id}`);
    } catch {
      toast.error('Error al crear la OM');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/supervisor/ordenes" style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')} onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Volver
        </Link>
        <span style={{ color: '#374151' }}>|</span>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>Nueva Orden / Unirse a OM</h1>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Step 1: Buscar */}
        <div className="card-gradient" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'white' }}>1</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Ingresa el número de OM de Electrocentro</h2>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              id="numero-om"
              className="input-field"
              type="text"
              value={numeroOM}
              onChange={e => { setNumeroOM(e.target.value); setBuscado(false); setOMEncontrada(null); }}
              placeholder="Ej: 500623447"
              onKeyDown={e => e.key === 'Enter' && buscarOM()}
              style={{ fontSize: 16, fontWeight: 600 }}
            />
            <button
              id="btn-buscar-om"
              onClick={buscarOM}
              className="btn-primary"
              disabled={buscando || !numeroOM.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              {buscando ? <div className="loading-spinner" style={{width:16,height:16}}/> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              )}
              Buscar
            </button>
          </div>

          {/* OM encontrada */}
          {buscado && omEncontrada && (
            <div style={{ marginTop: 16, padding: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#34d399', fontSize: 15, marginBottom: 4 }}>✓ OM {omEncontrada.numero_om} encontrada</p>
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>{omEncontrada.descripcion}</p>
                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    {omEncontrada.cuadrillas_nombres?.join(', ')} · {omEncontrada.zona}
                  </p>
                </div>
                <button
                  id="btn-unirse-om"
                  onClick={unirseOM}
                  className="btn-primary"
                  disabled={uniendose}
                >
                  {uniendose ? <div className="loading-spinner" style={{width:16,height:16}}/> : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  )}
                  Unirse
                </button>
              </div>
            </div>
          )}

          {/* OM no encontrada */}
          {buscado && !omEncontrada && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
              <p style={{ color: '#fcd34d', fontSize: 13 }}>
                ℹ️ Esta OM no está registrada aún. Completa los datos abajo para crearla.
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Crear (solo si no encontrada) */}
        {buscado && !omEncontrada && (
          <div className="card-gradient" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#d97706,#f59e0b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#0f172a' }}>2</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Registrar nueva OM en el sistema</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Descripción de la OM *</label>
                <input
                  id="descripcion-om"
                  className="input-field"
                  type="text"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Ej: Cambio de postes BT en Jr. Las Flores - Tarma"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Zona / Localidad</label>
                  <input
                    id="zona-om"
                    className="input-field"
                    type="text"
                    value={zona}
                    onChange={e => setZona(e.target.value)}
                    placeholder="Ej: Tarma Centro"
                  />
                </div>
                <div>
                  <label className="label">Fecha de Emisión</label>
                  <input
                    id="fecha-om"
                    className="input-field"
                    type="date"
                    value={fechaEmision}
                    onChange={e => setFechaEmision(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ padding: 14, background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)', fontSize: 13, color: '#94a3b8' }}>
                <b style={{ color: '#60a5fa' }}>Cuadrilla creadora:</b> {userData?.cuadrillaNombre} — {userData?.nombre}
              </div>

              <button
                id="btn-crear-om"
                onClick={crearNuevaOM}
                className="btn-primary"
                disabled={creando || !descripcion.trim()}
                style={{ padding: '13px 20px', fontSize: 15, justifyContent: 'center' }}
              >
                {creando ? <><div className="loading-spinner" style={{width:18,height:18}}/> Creando...</> : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Crear OM {numeroOM}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info si no ha buscado aún */}
        {!buscado && (
          <div className="alert-bar alert-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Primero busca el número de OM. Si ya existe, te unirás a ella. Si no, podrás crearla.</span>
          </div>
        )}
      </div>
    </div>
  );
}
