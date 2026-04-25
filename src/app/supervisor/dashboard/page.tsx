'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeOMsDeCuadrilla, subscribeTLsDeCuadrilla, getItemsOMDelMes, getTLsDelMes } from '@/lib/db';
import { OrdenMantenimiento, TrabajoLibre } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function formatMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SupervisorDashboard() {
  const { userData } = useAuth();
  const [oms, setOMs] = useState<OrdenMantenimiento[]>([]);
  const [tls, setTLs] = useState<TrabajoLibre[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMes, setTotalMes] = useState(0);

  useEffect(() => {
    if (!userData?.cuadrillaId) return;
    const unsub1 = subscribeOMsDeCuadrilla(userData.cuadrillaId, (data) => { setOMs(data); setLoading(false); });
    const unsub2 = subscribeTLsDeCuadrilla(userData.cuadrillaId, setTLs);
    return () => { unsub1(); unsub2(); };
  }, [userData]);

  // Calcula el total real del mes actual (no histórico)
  useEffect(() => {
    if (!userData?.cuadrillaId) return;
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();
    Promise.all([
      getItemsOMDelMes(userData.cuadrillaId, mes, anio),
      getTLsDelMes(userData.cuadrillaId, mes, anio),
    ]).then(([itemsMes, tlsMes]) => {
      const totalOMs = itemsMes.reduce((s, i) => s + i.subtotal, 0);
      const totalTLs = tlsMes.filter(t => t.estado !== 'afiliado').reduce((s, t) => s + t.total_valorizado, 0);
      setTotalMes(totalOMs + totalTLs);
    });
  }, [userData, oms, tls]);

  const omsActivas = oms.filter(o => o.estado === 'activa');
  const tlsPendientes = tls.filter(t => t.estado === 'pendiente');

  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const hoyCompleto = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="page-content fade-in">

      {/* ══════════════════════════════════════════════
          ZONA DE REGISTRO DIARIO — Lo más importante
      ══════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(30,58,138,0.1) 100%)',
        border: '1px solid rgba(59,130,246,0.35)',
        borderRadius: 20,
        padding: '24px 28px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 160, height: 160,
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)', animation: 'pulse-slow 2s ease-in-out infinite' }}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registro de hoy</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
              Hola, {userData?.nombre?.split(' ')[0]} 👋
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, textTransform: 'capitalize' }}>{hoyCompleto}</p>
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '5px 12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>{userData?.cuadrillaNombre}</span>
              <span style={{ color: '#374151' }}>·</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{userData?.provincia}</span>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
            <Link href="/supervisor/ordenes/nueva" className="btn-primary" style={{ justifyContent: 'center', padding: '12px 20px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva OM / Unirse a OM
            </Link>
            <Link href="/supervisor/trabajos-libres/nuevo" className="btn-amber" style={{ justifyContent: 'center', padding: '12px 20px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Sin OM aún → Trabajo Libre
            </Link>
          </div>
        </div>

        {/* OMs activas para acceso rápido al registro */}
        {loading ? (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="loading-spinner" style={{ width: 16, height: 16 }}/>
            <span style={{ color: '#64748b', fontSize: 13 }}>Cargando tus órdenes...</span>
          </div>
        ) : omsActivas.length > 0 ? (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              📋 Tus OMs activas — clic para registrar trabajo de hoy:
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {omsActivas.map(om => (
                <Link key={om.id} href={`/supervisor/ordenes/${om.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(5,16,31,0.7)',
                    border: '2px solid rgba(59,130,246,0.4)',
                    borderRadius: 12,
                    padding: '10px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.8)';
                    e.currentTarget.style.background = 'rgba(37,99,235,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                    e.currentTarget.style.background = 'rgba(5,16,31,0.7)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }}/>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', marginBottom: 1 }}>OM {om.numero_om}</p>
                      <p style={{ fontSize: 11, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{om.descripcion}</p>
                    </div>
                    <div style={{ marginLeft: 8, textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>{formatMoney(om.total_valorizado || 0)}</p>
                      <p style={{ fontSize: 10, color: '#60a5fa' }}>→ Registrar</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: '#fcd34d' }}>
              ⚡ No tienes OMs activas aún. <b>Crea o únete a una OM</b> para empezar a valorizar, o usa <b>Trabajo Libre</b> si no tienes el número de OM todavía.
            </p>
          </div>
        )}
      </div>

      {/* Alerta de TLs pendientes */}
      {tlsPendientes.length > 0 && (
        <div className="alert-bar alert-warning" style={{ marginBottom: 24 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Tienes <b>{tlsPendientes.length} Trabajo(s) Libre(s)</b> esperando ser afiliados a una OM. Hazlo cuando llegue el número de Electrocentro.</span>
          <Link href="/supervisor/trabajos-libres" style={{ marginLeft: 'auto', color: '#fcd34d', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Afiliar ahora →</Link>
        </div>
      )}

      {/* Stats resumen */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-value money">{formatMoney(totalMes)}</div>
          <div className="stat-label">Valorizado este mes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>{omsActivas.length}</div>
          <div className="stat-label">OMs activas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{tlsPendientes.length}</div>
          <div className="stat-label">Trab. Libres sin OM</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div className="stat-value" style={{ color: '#a78bfa' }}>{oms.length}</div>
          <div className="stat-label">Total OMs del mes</div>
        </div>
      </div>

      {/* Cómo funciona — guía rápida visible solo si no hay OMs */}
      {!loading && oms.length === 0 && (
        <div className="card-gradient" style={{ padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>
            📖 ¿Cómo funciona el registro diario?
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { num: '1', title: 'Obtén el N° de OM', desc: 'Electrocentro te da un número de Orden de Mantenimiento', color: '#3b82f6' },
              { num: '2', title: 'Crea o únete a la OM', desc: 'Busca si ya existe. Si no, créala. Varias cuadrillas pueden trabajar en la misma OM.', color: '#8b5cf6' },
              { num: '3', title: 'Registra cada día', desc: 'Entra a la OM y agrega las partidas que realizaste hoy con su cantidad.', color: '#10b981' },
              { num: '4', title: 'Sin OM todavía?', desc: 'Usa "Trabajo Libre" y después afilias el trabajo cuando llegue la OM.', color: '#f59e0b' },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${step.color}22, ${step.color}11)`,
                  border: `1px solid ${step.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 15, color: step.color,
                }}>
                  {step.num}
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginBottom: 3 }}>{step.title}</p>
                  <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial reciente */}
      {oms.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card-gradient" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="section-title" style={{ marginBottom: 0, fontSize: 15 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                Todas mis OMs
              </h3>
              <Link href="/supervisor/ordenes" style={{ fontSize: 12, color: '#60a5fa' }}>Ver todas →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oms.slice(0, 6).map(om => (
                <Link key={om.id} href={`/supervisor/ordenes/${om.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(5,16,31,0.5)', border: '1px solid rgba(59,130,246,0.1)',
                    borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.1)')}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>OM {om.numero_om}</p>
                      <p style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{om.descripcion}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="money" style={{ fontSize: 13 }}>{formatMoney(om.total_valorizado || 0)}</p>
                      <span className={`badge ${om.estado === 'activa' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10, marginTop: 2 }}>{om.estado}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card-gradient" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="section-title" style={{ marginBottom: 0, fontSize: 15 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M9 11l3 3L22 4"/></svg>
                Trabajos Libres
              </h3>
              <Link href="/supervisor/trabajos-libres" style={{ fontSize: 12, color: '#60a5fa' }}>Ver todos →</Link>
            </div>
            {tls.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <p style={{ fontSize: 13 }}>Sin trabajos libres registrados</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tls.slice(0, 6).map(tl => (
                  <div key={tl.id} style={{
                    background: 'rgba(5,16,31,0.5)', border: '1px solid rgba(245,158,11,0.1)',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{tl.descripcion}</p>
                      <p style={{ fontSize: 11, color: '#64748b' }}>{tl.fecha}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="money" style={{ fontSize: 13 }}>{formatMoney(tl.total_valorizado || 0)}</p>
                      <span className={`badge ${tl.estado === 'pendiente' ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 10, marginTop: 2 }}>{tl.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
