'use client';
import { useEffect, useState, useRef } from 'react';
import { getCuadrillas, getSupervisores, toggleActivoUsuario, crearDocumentoUsuario } from '@/lib/db';
import { Usuario, Cuadrilla } from '@/types';
import toast from 'react-hot-toast';

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

const PROVINCIAS = ['Tarma', 'Huancayo', 'Junín', 'Chanchamayo'];

export default function UsuariosPage() {
  const [supervisores, setSupervisores] = useState<Usuario[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Form crear usuario
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', confirmarPassword: '',
    cuadrillaId: '', provincia: '',
  });

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getSupervisores(), getCuadrillas()]).then(([sups, cuads]) => {
      setSupervisores(sups.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCuadrillas(cuads.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setLoading(false);
    });
  }, []);

  // Cierra modal al hacer clic afuera
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false);
        resetForm();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModal]);

  function resetForm() {
    setForm({ nombre: '', email: '', password: '', confirmarPassword: '', cuadrillaId: '', provincia: '' });
  }

  const supsFiltrados = supervisores.filter(s =>
    s.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    s.email.toLowerCase().includes(filtro.toLowerCase()) ||
    (s.cuadrillaNombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (s.provincia || '').toLowerCase().includes(filtro.toLowerCase())
  );

  async function handleToggleActivo(sup: Usuario) {
    const nuevoEstado = sup.activo === false ? true : false;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que deseas ${accion} la cuenta de ${sup.nombre}?`)) return;
    try {
      await toggleActivoUsuario(sup.uid, nuevoEstado);
      setSupervisores(prev => prev.map(s => s.uid === sup.uid ? { ...s, activo: nuevoEstado } : s));
      if (selected?.uid === sup.uid) setSelected({ ...selected, activo: nuevoEstado });
      toast.success(`Cuenta ${nuevoEstado ? 'activada' : 'desactivada'} correctamente`);
    } catch {
      toast.error('Error al actualizar el estado de la cuenta');
    }
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmarPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (!form.cuadrillaId) {
      toast.error('Selecciona una cuadrilla');
      return;
    }
    setGuardando(true);
    try {
      // 1 — Crear cuenta en Firebase Auth (server-side para no cerrar sesión del admin)
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); setGuardando(false); return; }

      const cuadrilla = cuadrillas.find(c => c.id === form.cuadrillaId)!;

      // 2 — Crear documento en Firestore (client-side con permisos de superadmin)
      await crearDocumentoUsuario(data.uid, {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rol: 'supervisor',
        cuadrillaId: cuadrilla.id,
        cuadrillaNombre: cuadrilla.nombre,
        provincia: cuadrilla.provincia,
        activo: true,
      });

      const nuevo: Usuario = {
        uid: data.uid,
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rol: 'supervisor',
        cuadrillaId: cuadrilla.id,
        cuadrillaNombre: cuadrilla.nombre,
        provincia: cuadrilla.provincia,
        activo: true,
        createdAt: new Date().toISOString(),
      };
      setSupervisores(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      toast.success(`Supervisor ${form.nombre} creado correctamente`);
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Error al crear el supervisor');
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Cargando supervisores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>Gestión de Supervisores</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{supervisores.length} supervisores registrados · {supervisores.filter(s => s.activo !== false).length} activos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '11px 20px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Supervisor
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Tabla */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Buscador */}
          <div style={{ marginBottom: 16 }}>
            <input
              className="input-field"
              placeholder="Buscar por nombre, email, cuadrilla o provincia..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              style={{ maxWidth: 420 }}
            />
          </div>

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
                  <tr>
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                      {filtro ? 'Sin resultados para esa búsqueda' : 'No hay supervisores registrados'}
                    </td>
                  </tr>
                ) : supsFiltrados.map((sup, i) => (
                  <tr key={sup.uid} style={{
                    borderBottom: i < supsFiltrados.length - 1 ? '1px solid rgba(59,130,246,0.08)' : 'none',
                    background: selected?.uid === sup.uid ? 'rgba(139,92,246,0.06)' : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.25))',
                          border: '1px solid rgba(139,92,246,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
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
                        <button
                          onClick={() => setSelected(selected?.uid === sup.uid ? null : sup)}
                          style={{
                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: selected?.uid === sup.uid ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)',
                            border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', transition: 'all 0.15s',
                          }}
                        >
                          {selected?.uid === sup.uid ? 'Cerrar' : 'Ver detalle'}
                        </button>
                        <button
                          onClick={() => handleToggleActivo(sup)}
                          style={{
                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: sup.activo !== false ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                            border: `1px solid ${sup.activo !== false ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                            color: sup.activo !== false ? '#f87171' : '#10b981', transition: 'all 0.15s',
                          }}
                        >
                          {sup.activo !== false ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de detalle */}
        {selected && (
          <div className="card-gradient fade-in" style={{ width: 300, flexShrink: 0, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Perfil del Supervisor</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Avatar */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: '0 auto 12px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.3))',
                border: '2px solid rgba(139,92,246,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{selected.nombre}</p>
              <div style={{ marginTop: 6 }}><Badge activo={selected.activo} /></div>
            </div>

            {/* Datos */}
            {[
              { label: 'Correo electrónico', value: selected.email, icon: '✉️' },
              { label: 'Cuadrilla', value: selected.cuadrillaNombre || '—', icon: '👷' },
              { label: 'Provincia', value: selected.provincia || '—', icon: '📍' },
              { label: 'Rol', value: 'Supervisor', icon: '🔑' },
              {
                label: 'Registrado',
                value: selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—',
                icon: '📅'
              },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(5,16,31,0.5)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.1)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{icon} {label}</p>
                <p style={{ fontSize: 13, color: '#e2e8f0', wordBreak: 'break-all' }}>{value}</p>
              </div>
            ))}

            {/* Acción desde panel */}
            <button
              onClick={() => handleToggleActivo(selected)}
              className={selected.activo !== false ? 'btn-danger' : 'btn-primary'}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '10px 16px' }}
            >
              {selected.activo !== false ? (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Desactivar cuenta</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Activar cuenta</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal crear supervisor */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div ref={modalRef} className="card-gradient fade-in" style={{ width: '100%', maxWidth: 480, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Nuevo Supervisor</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCrear}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
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
