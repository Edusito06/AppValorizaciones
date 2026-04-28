'use client';
import { useEffect, useState, useRef } from 'react';
import { getCuadrillas, getSupervisores, toggleActivoUsuario, crearDocumentoUsuario } from '@/lib/db';
import { Usuario, Cuadrilla } from '@/types';
import toast from 'react-hot-toast';

// ─── Componentes reutilizables ────────────────────────────────────────────────
function Badge({ activo }: { activo?: boolean }) {
  const ok = activo !== false;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      color: ok ? '#10b981' : '#ef4444',
      border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? '#10b981' : '#ef4444' }} />
      {ok ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ─── Dialog de confirmación personalizado ─────────────────────────────────────
function ConfirmDialog({ mensaje, onConfirm, onCancel }: {
  mensaje: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card-gradient fade-in" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Confirmar acción</p>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{mensaje}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(100,116,139,0.3)', background: 'transparent', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '10px 16px' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

const PROVINCIAS = ['Tarma', 'Huancayo', 'Junín', 'Chanchamayo'];

export default function UsuariosPage() {
  const [supervisores, setSupervisores] = useState<Usuario[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [confirm, setConfirm] = useState<{ mensaje: string; onConfirm: () => void } | null>(null);

  const [form, setForm] = useState({
    nombre: '', email: '', password: '', confirmarPassword: '',
    cuadrillaId: '', provincia: '',
  });

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    Promise.all([getSupervisores(), getCuadrillas()])
      .then(([sups, cuads]) => {
        setSupervisores(sups.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setCuadrillas(cuads.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error al cargar supervisores:', err?.code, err?.message);
        setError(`${err?.code || 'unknown'}: ${err?.message || 'Error desconocido'}`);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false); resetForm();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModal]);

  function resetForm() {
    setForm({ nombre: '', email: '', password: '', confirmarPassword: '', cuadrillaId: '', provincia: '' });
  }

  function abrirDetalle(sup: Usuario) {
    setSelected(sup);
    setShowDetalle(true);
  }

  const supsFiltrados = supervisores.filter(s =>
    s.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    s.email.toLowerCase().includes(filtro.toLowerCase()) ||
    (s.cuadrillaNombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (s.provincia || '').toLowerCase().includes(filtro.toLowerCase())
  );

  function pedirConfirm(mensaje: string, onConfirm: () => void) {
    setConfirm({ mensaje, onConfirm });
  }

  async function ejecutarToggleActivo(sup: Usuario) {
    const nuevoEstado = sup.activo === false ? true : false;
    try {
      await toggleActivoUsuario(sup.uid, nuevoEstado);
      setSupervisores(prev => prev.map(s => s.uid === sup.uid ? { ...s, activo: nuevoEstado } : s));
      if (selected?.uid === sup.uid) setSelected(prev => prev ? { ...prev, activo: nuevoEstado } : null);
      toast.success(`Cuenta ${nuevoEstado ? 'activada' : 'desactivada'} correctamente`);
    } catch {
      toast.error('Error al actualizar el estado de la cuenta');
    }
  }

  function handleToggleActivo(sup: Usuario) {
    const nuevoEstado = sup.activo === false ? true : false;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    pedirConfirm(
      `¿Estás seguro de que deseas ${accion} la cuenta de ${sup.nombre}?`,
      () => ejecutarToggleActivo(sup)
    );
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmarPassword) { toast.error('Las contraseñas no coinciden'); return; }
    if (!form.cuadrillaId) { toast.error('Selecciona una cuadrilla'); return; }
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); setGuardando(false); return; }

      const cuadrilla = cuadrillas.find(c => c.id === form.cuadrillaId)!;
      await crearDocumentoUsuario(data.uid, {
        nombre: form.nombre.trim(), email: form.email.trim(), rol: 'supervisor',
        cuadrillaId: cuadrilla.id, cuadrillaNombre: cuadrilla.nombre,
        provincia: cuadrilla.provincia, activo: true,
      });

      setSupervisores(prev => [...prev, {
        uid: data.uid, nombre: form.nombre.trim(), email: form.email.trim(),
        rol: 'supervisor' as const, cuadrillaId: cuadrilla.id, cuadrillaNombre: cuadrilla.nombre,
        provincia: cuadrilla.provincia, activo: true, createdAt: new Date().toISOString(),
      }].sort((a, b) => a.nombre.localeCompare(b.nombre)));

      toast.success(`Supervisor ${form.nombre} creado correctamente`);
      setShowModal(false); resetForm();
    } catch {
      toast.error('Error al crear el supervisor');
    } finally {
      setGuardando(false);
    }
  }

  // ─── Estados carga / error ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Cargando supervisores...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.7 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p style={{ color: '#f87171', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Error al cargar</p>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{error}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    </div>
  );

  // ─── Panel de detalle (compartido móvil/desktop) ──────────────────────────────
  const DetalleContent = ({ sup }: { sup: Usuario }) => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Perfil del Supervisor</h3>
        <button onClick={() => { setSelected(null); setShowDetalle(false); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 12px', background: 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(109,40,217,0.3))', border: '2px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{sup.nombre}</p>
        <div style={{ marginTop: 6 }}><Badge activo={sup.activo} /></div>
      </div>
      {[
        { label: 'Correo', value: sup.email, icon: '✉️' },
        { label: 'Cuadrilla', value: sup.cuadrillaNombre || '—', icon: '👷' },
        { label: 'Provincia', value: sup.provincia || '—', icon: '📍' },
        { label: 'Rol', value: 'Supervisor', icon: '🔑' },
        { label: 'Registrado', value: sup.createdAt ? new Date(sup.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—', icon: '📅' },
      ].map(({ label, value, icon }) => (
        <div key={label} style={{ marginBottom: 10, padding: '10px 14px', background: 'rgba(5,16,31,0.5)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.1)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{icon} {label}</p>
          <p style={{ fontSize: 13, color: '#e2e8f0', wordBreak: 'break-all' }}>{value}</p>
        </div>
      ))}
      <button onClick={() => handleToggleActivo(sup)}
        className={sup.activo !== false ? 'btn-danger' : 'btn-primary'}
        style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {sup.activo !== false
          ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Desactivar cuenta</>
          : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Activar cuenta</>
        }
      </button>
    </>
  );

  // ─── Render principal ─────────────────────────────────────────────────────────
  return (
    <div className="page-content fade-in">

      {/* Dialog de confirmación personalizado */}
      {confirm && (
        <ConfirmDialog
          mensaje={confirm.mensaje}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>Gestión de Supervisores</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>{supervisores.length} registrados · {supervisores.filter(s => s.activo !== false).length} activos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '10px 16px', fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Supervisor
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: 16 }}>
        <input className="input-field" placeholder="Buscar por nombre, email, cuadrilla o provincia..."
          value={filtro} onChange={e => setFiltro(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Lista */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {supsFiltrados.length === 0 ? (
                <div className="card-gradient" style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                  {filtro ? 'Sin resultados' : 'No hay supervisores registrados'}
                </div>
              ) : supsFiltrados.map(sup => (
                <div key={sup.uid} className="card-gradient" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(109,40,217,0.25))', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.nombre}</p>
                        <p style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.cuadrillaNombre} · {sup.provincia}</p>
                      </div>
                    </div>
                    <Badge activo={sup.activo} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => abrirDetalle(sup)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                      Ver detalle
                    </button>
                    <button onClick={() => handleToggleActivo(sup)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: sup.activo !== false ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${sup.activo !== false ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, color: sup.activo !== false ? '#f87171' : '#10b981' }}>
                      {sup.activo !== false ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-gradient" style={{ overflow: 'hidden', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                    {['Supervisor', 'Cuadrilla', 'Provincia', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supsFiltrados.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                      {filtro ? 'Sin resultados' : 'No hay supervisores registrados'}
                    </td></tr>
                  ) : supsFiltrados.map((sup, i) => (
                    <tr key={sup.uid} style={{ borderBottom: i < supsFiltrados.length - 1 ? '1px solid rgba(59,130,246,0.08)' : 'none', background: selected?.uid === sup.uid ? 'rgba(139,92,246,0.06)' : 'transparent', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(109,40,217,0.25))', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{sup.nombre}</p>
                            <p style={{ fontSize: 11, color: '#64748b' }}>{sup.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>{sup.cuadrillaNombre || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>{sup.provincia || '—'}</td>
                      <td style={{ padding: '14px 16px' }}><Badge activo={sup.activo} /></td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => selected?.uid === sup.uid ? setSelected(null) : abrirDetalle(sup)}
                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: selected?.uid === sup.uid ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                            {selected?.uid === sup.uid ? 'Cerrar' : 'Ver detalle'}
                          </button>
                          <button onClick={() => handleToggleActivo(sup)}
                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: sup.activo !== false ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${sup.activo !== false ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, color: sup.activo !== false ? '#f87171' : '#10b981' }}>
                            {sup.activo !== false ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel detalle desktop */}
        {!isMobile && selected && (
          <div className="card-gradient fade-in" style={{ width: 300, flexShrink: 0, padding: 24 }}>
            <DetalleContent sup={selected} />
          </div>
        )}
      </div>

      {/* ── Modal detalle móvil (bottom-sheet) ── */}
      {isMobile && showDetalle && selected && (
        <div
          onClick={() => { setShowDetalle(false); setSelected(null); }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{ background: 'linear-gradient(135deg,rgba(13,31,60,0.99) 0%,rgba(5,16,31,0.99) 100%)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '20px 20px 0 0', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
            <DetalleContent sup={selected} />
          </div>
        </div>
      )}

      {/* ── Modal crear supervisor ── */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, background: 'rgba(0,0,0,0.75)', overflowY: 'auto', padding: isMobile ? '16px 16px 32px' : '24px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center' }}
        >
          <div ref={modalRef} className="card-gradient fade-in" style={{ width: '100%', maxWidth: 480, padding: isMobile ? 20 : 32, marginTop: isMobile ? 0 : 'auto', marginBottom: isMobile ? 0 : 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Nuevo Supervisor</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCrear}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">Nombre completo</label>
                  <input className="input-field" placeholder="Ej: Carlos Quispe Huamán" required
                    value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Correo electrónico</label>
                  <input className="input-field" type="email" placeholder="correo@empresa.pe" required
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Contraseña</label>
                  <input className="input-field" type="password" placeholder="Mínimo 6 caracteres" required minLength={6}
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Confirmar contraseña</label>
                  <input className="input-field" type="password" placeholder="Repite la contraseña" required minLength={6}
                    value={form.confirmarPassword} onChange={e => setForm(f => ({ ...f, confirmarPassword: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Cuadrilla asignada</label>
                  <select className="input-field" required value={form.cuadrillaId}
                    onChange={e => {
                      const c = cuadrillas.find(c => c.id === e.target.value);
                      setForm(f => ({ ...f, cuadrillaId: e.target.value, provincia: c?.provincia || '' }));
                    }}>
                    <option value="">Selecciona una cuadrilla...</option>
                    {PROVINCIAS.map(prov => (
                      <optgroup key={prov} label={prov}>
                        {cuadrillas.filter(c => c.provincia === prov).map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {form.provincia && (
                  <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10 }}>
                    <p style={{ fontSize: 12, color: '#a78bfa' }}>📍 Provincia: <strong>{form.provincia}</strong></p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                    style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(100,116,139,0.3)', background: 'transparent', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '11px 16px' }} disabled={guardando}>
                    {guardando ? <><div className="loading-spinner" style={{ width: 16, height: 16 }} />Creando...</> : 'Crear Supervisor'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
