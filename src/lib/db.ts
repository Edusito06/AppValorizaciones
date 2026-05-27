import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, onSnapshot, setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Cuadrilla, Partida, OrdenMantenimiento, ItemOM,
  TrabajoLibre, ItemTL, Usuario
} from '@/types';

// ─── Helper: sort client-side ─────────────────────────────────────────────────
function sortByCreatedAt<T extends { createdAt: string }>(arr: T[], dir: 'asc' | 'desc' = 'desc'): T[] {
  return [...arr].sort((a, b) =>
    dir === 'desc'
      ? b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt)
  );
}

// ─── CUADRILLAS ───────────────────────────────────────────────────────────────
export async function getCuadrillas(): Promise<Cuadrilla[]> {
  const snap = await getDocs(collection(db, 'cuadrillas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cuadrilla));
}

export function subscribeCuadrillas(cb: (c: Cuadrilla[]) => void) {
  return onSnapshot(collection(db, 'cuadrillas'), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cuadrilla)));
  });
}

// ─── PARTIDAS ─────────────────────────────────────────────────────────────────
export async function getPartidas(): Promise<Partida[]> {
  const snap = await getDocs(collection(db, 'partidas'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Partida));
  return data.sort((a, b) => a.codigo.localeCompare(b.codigo));
}

// ─── ÓRDENES DE MANTENIMIENTO ─────────────────────────────────────────────────
export async function crearOM(data: Omit<OrdenMantenimiento, 'id' | 'createdAt' | 'total_valorizado'>): Promise<string> {
  const ref = await addDoc(collection(db, 'ordenes_mantenimiento'), {
    ...data,
    total_valorizado: 0,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function buscarOMPorNumero(numero_om: string): Promise<OrdenMantenimiento | null> {
  const q = query(collection(db, 'ordenes_mantenimiento'), where('numero_om', '==', numero_om.trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as OrdenMantenimiento;
}

export async function unirseAOM(ordenId: string, cuadrillaId: string, cuadrillaNombre: string): Promise<void> {
  const ref = doc(db, 'ordenes_mantenimiento', ordenId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const ids: string[] = data.cuadrillas_ids || [];
  const nombres: string[] = data.cuadrillas_nombres || [];
  if (!ids.includes(cuadrillaId)) {
    await updateDoc(ref, {
      cuadrillas_ids: [...ids, cuadrillaId],
      cuadrillas_nombres: [...nombres, cuadrillaNombre],
    });
  }
}

export async function getOMsDeCuadrilla(cuadrillaId: string): Promise<OrdenMantenimiento[]> {
  // No orderBy → no composite index needed. Sort client-side.
  const q = query(
    collection(db, 'ordenes_mantenimiento'),
    where('cuadrillas_ids', 'array-contains', cuadrillaId)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrdenMantenimiento));
  return sortByCreatedAt(data);
}

export function subscribeOMsDeCuadrilla(cuadrillaId: string, cb: (oms: OrdenMantenimiento[]) => void) {
  // No orderBy → no composite index needed. Sort client-side.
  const q = query(
    collection(db, 'ordenes_mantenimiento'),
    where('cuadrillas_ids', 'array-contains', cuadrillaId)
  );
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrdenMantenimiento));
    cb(sortByCreatedAt(data));
  });
}

export function subscribeTodasOMs(cb: (oms: OrdenMantenimiento[]) => void) {
  // Simple collection read — no composite index needed
  return onSnapshot(collection(db, 'ordenes_mantenimiento'), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrdenMantenimiento));
    cb(sortByCreatedAt(data));
  });
}

export async function cerrarOM(ordenId: string): Promise<void> {
  await updateDoc(doc(db, 'ordenes_mantenimiento', ordenId), { estado: 'cerrada' });
}

// ─── ITEMS DE OM ──────────────────────────────────────────────────────────────
export async function agregarItemOM(item: Omit<ItemOM, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'items_om'), {
    ...item,
    createdAt: new Date().toISOString(),
  });
  // Update total in OM
  const omRef = doc(db, 'ordenes_mantenimiento', item.orden_id);
  const omSnap = await getDoc(omRef);
  if (omSnap.exists()) {
    const current = omSnap.data().total_valorizado || 0;
    await updateDoc(omRef, { total_valorizado: current + item.subtotal });
  }
  return ref.id;
}

export function subscribeItemsOM(ordenId: string, cuadrillaId: string, cb: (items: ItemOM[]) => void) {
  // Composite index: orden_id + cuadrilla_id + createdAt (firestore.indexes.json)
  const q = query(
    collection(db, 'items_om'),
    where('orden_id', '==', ordenId),
    where('cuadrilla_id', '==', cuadrillaId)
  );
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ItemOM));
    cb(sortByCreatedAt(data));
  });
}

export async function getItemsOMCompletos(ordenId: string): Promise<ItemOM[]> {
  const q = query(collection(db, 'items_om'), where('orden_id', '==', ordenId));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ItemOM));
  return sortByCreatedAt(data);
}

export async function eliminarItemOM(itemId: string, ordenId: string, subtotal: number): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'items_om', itemId));
  const omRef = doc(db, 'ordenes_mantenimiento', ordenId);
  const omSnap = await getDoc(omRef);
  if (omSnap.exists()) {
    const current = omSnap.data().total_valorizado || 0;
    batch.update(omRef, { total_valorizado: Math.max(0, current - subtotal) });
  }
  await batch.commit();
}

// ─── TRABAJOS LIBRES ──────────────────────────────────────────────────────────
export async function crearTrabajoLibre(data: Omit<TrabajoLibre, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'trabajos_libres'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export function subscribeTLsDeCuadrilla(cuadrillaId: string, cb: (tls: TrabajoLibre[]) => void) {
  // Single where → no composite index needed
  const q = query(
    collection(db, 'trabajos_libres'),
    where('cuadrilla_id', '==', cuadrillaId)
  );
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as TrabajoLibre));
    cb(sortByCreatedAt(data));
  });
}

export function subscribeTodosLosTLs(cb: (tls: TrabajoLibre[]) => void) {
  return onSnapshot(collection(db, 'trabajos_libres'), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as TrabajoLibre));
    cb(sortByCreatedAt(data));
  });
}

export async function agregarItemTL(item: Omit<ItemTL, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'items_tl'), {
    ...item,
    createdAt: new Date().toISOString(),
  });
  // Update total in TL
  const tlRef = doc(db, 'trabajos_libres', item.trabajo_libre_id);
  const tlSnap = await getDoc(tlRef);
  if (tlSnap.exists()) {
    const current = tlSnap.data().total_valorizado || 0;
    await updateDoc(tlRef, { total_valorizado: current + item.subtotal });
  }
  return ref.id;
}

export function subscribeItemsTL(tlId: string, cb: (items: ItemTL[]) => void) {
  // Single where → no composite index needed
  const q = query(
    collection(db, 'items_tl'),
    where('trabajo_libre_id', '==', tlId)
  );
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ItemTL));
    cb(sortByCreatedAt(data));
  });
}

export async function afiliarTLaOM(tlId: string, ordenId: string, numeroOM: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'trabajos_libres', tlId), {
    estado: 'afiliado',
    orden_id_afiliada: ordenId,
    numero_om_afiliada: numeroOM,
    fecha_afiliacion: new Date().toISOString(),
  });
  const itemsSnap = await getDocs(query(collection(db, 'items_tl'), where('trabajo_libre_id', '==', tlId)));
  const tlSnap = await getDoc(doc(db, 'trabajos_libres', tlId));
  const tlData = tlSnap.data();

  for (const item of itemsSnap.docs) {
    const iData = item.data();
    const newItemRef = doc(collection(db, 'items_om'));
    batch.set(newItemRef, {
      orden_id: ordenId,
      cuadrilla_id: iData.cuadrilla_id,
      cuadrilla_nombre: tlData?.cuadrilla_nombre || '',
      supervisor_id: iData.supervisor_id,
      supervisor_nombre: tlData?.supervisor_nombre || '',
      partida_id: iData.partida_id,
      codigo: iData.codigo,
      descripcion: iData.descripcion,
      unidad: iData.unidad,
      categoria: iData.categoria,
      cantidad: iData.cantidad,
      precio_unitario: iData.precio_unitario,
      subtotal: iData.subtotal,
      fecha_ejecucion: iData.fecha_ejecucion,
      observaciones: (iData.observaciones || '') + ' [Afiliado desde TL]',
      ...(iData.fotoUrl ? { fotoUrl: iData.fotoUrl } : {}),
      createdAt: new Date().toISOString(),
    });
  }

  const omRef = doc(db, 'ordenes_mantenimiento', ordenId);
  const omSnap = await getDoc(omRef);
  if (omSnap.exists() && tlData) {
    const current = omSnap.data().total_valorizado || 0;
    batch.update(omRef, { total_valorizado: current + (tlData.total_valorizado || 0) });
    const cuadIds: string[] = omSnap.data().cuadrillas_ids || [];
    if (tlData.cuadrilla_id && !cuadIds.includes(tlData.cuadrilla_id)) {
      batch.update(omRef, {
        cuadrillas_ids: [...cuadIds, tlData.cuadrilla_id],
        cuadrillas_nombres: [...(omSnap.data().cuadrillas_nombres || []), tlData.cuadrilla_nombre],
      });
    }
  }

  await batch.commit();
}

// ─── CONSOLIDADO MENSUAL ───────────────────────────────────────────────────────
export async function getItemsOMDelMes(cuadrillaId: string, mes: number, anio: number): Promise<ItemOM[]> {
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAnio = mes === 12 ? anio + 1 : anio;
  const fin = `${nextAnio}-${String(nextMes).padStart(2, '0')}-01`;
  // Single where → filter fecha client-side to avoid composite index
  const q = query(
    collection(db, 'items_om'),
    where('cuadrilla_id', '==', cuadrillaId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ItemOM))
    .filter(i => i.fecha_ejecucion >= inicio && i.fecha_ejecucion < fin)
    .sort((a, b) => a.fecha_ejecucion.localeCompare(b.fecha_ejecucion));
}

export async function getTLsDelMes(cuadrillaId: string, mes: number, anio: number): Promise<TrabajoLibre[]> {
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAnio = mes === 12 ? anio + 1 : anio;
  const fin = `${nextAnio}-${String(nextMes).padStart(2, '0')}-01`;
  // Single where → filter fecha client-side
  const q = query(
    collection(db, 'trabajos_libres'),
    where('cuadrilla_id', '==', cuadrillaId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as TrabajoLibre))
    .filter(t => t.fecha >= inicio && t.fecha < fin);
}

// ─── TRABAJOS LIBRES — operaciones adicionales ────────────────────────────────
export async function getTrabajoLibre(tlId: string): Promise<TrabajoLibre | null> {
  const snap = await getDoc(doc(db, 'trabajos_libres', tlId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TrabajoLibre;
}

export async function marcarTLSinCubrir(tlId: string): Promise<void> {
  await updateDoc(doc(db, 'trabajos_libres', tlId), { estado: 'sin_cubrir' });
}

export async function eliminarItemTL(itemId: string, tlId: string, subtotal: number): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'items_tl', itemId));
  const tlRef = doc(db, 'trabajos_libres', tlId);
  const tlSnap = await getDoc(tlRef);
  if (tlSnap.exists()) {
    const current = tlSnap.data().total_valorizado || 0;
    batch.update(tlRef, { total_valorizado: Math.max(0, current - subtotal) });
  }
  await batch.commit();
}

// ─── ACTIVIDAD GLOBAL (items_om + items_tl) ───────────────────────────────────
export async function getActividadResumenGlobal(): Promise<
  Record<string, { hoy: number; ultimaFecha: string | null }>
> {
  const hoy = new Date().toISOString().split('T')[0];
  const result: Record<string, { hoy: number; ultimaFecha: string | null }> = {};

  // Contar items de OMs
  const snapOM = await getDocs(collection(db, 'items_om'));
  snapOM.docs.forEach(d => {
    const data = d.data();
    const cid: string = data.cuadrilla_id;
    const fecha: string = data.fecha_ejecucion;
    if (!result[cid]) result[cid] = { hoy: 0, ultimaFecha: null };
    if (fecha === hoy) result[cid].hoy++;
    if (!result[cid].ultimaFecha || fecha > result[cid].ultimaFecha) {
      result[cid].ultimaFecha = fecha;
    }
  });

  // Contar items de Trabajos Libres (también son actividad)
  const snapTL = await getDocs(collection(db, 'items_tl'));
  snapTL.docs.forEach(d => {
    const data = d.data();
    const cid: string = data.cuadrilla_id;
    const fecha: string = data.fecha_ejecucion;
    if (!result[cid]) result[cid] = { hoy: 0, ultimaFecha: null };
    if (fecha === hoy) result[cid].hoy++;
    if (!result[cid].ultimaFecha || fecha > result[cid].ultimaFecha) {
      result[cid].ultimaFecha = fecha;
    }
  });

  return result;
}

// ─── CONSOLIDADO GLOBAL (2 queries en vez de 24) ─────────────────────────────
export async function getItemsOMGlobalDelMes(mes: number, anio: number): Promise<ItemOM[]> {
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAnio = mes === 12 ? anio + 1 : anio;
  const fin = `${nextAnio}-${String(nextMes).padStart(2, '0')}-01`;
  const snap = await getDocs(collection(db, 'items_om'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ItemOM))
    .filter(i => i.fecha_ejecucion >= inicio && i.fecha_ejecucion < fin);
}

export async function getTLsGlobalDelMes(mes: number, anio: number): Promise<TrabajoLibre[]> {
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAnio = mes === 12 ? anio + 1 : anio;
  const fin = `${nextAnio}-${String(nextMes).padStart(2, '0')}-01`;
  const snap = await getDocs(collection(db, 'trabajos_libres'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as TrabajoLibre))
    .filter(t => t.fecha >= inicio && t.fecha < fin);
}

// ─── GESTIÓN DE USUARIOS ──────────────────────────────────────────────────────
export async function getSupervisores(): Promise<Usuario[]> {
  const q = query(collection(db, 'users'), where('rol', '==', 'supervisor'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as Usuario));
}

export async function toggleActivoUsuario(uid: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { activo });
}

export async function crearDocumentoUsuario(uid: string, data: Omit<Usuario, 'uid'>): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ...data, createdAt: new Date().toISOString() });
}
