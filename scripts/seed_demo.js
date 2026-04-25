// Script de escenario demo realista - CIEEC Electrocentro
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, getDoc, writeBatch } = require('firebase/firestore');

const config = {
  apiKey: 'AIzaSyB8D_qG6pcBUBPMIetgFRZiKRg-MJs8fKY',
  authDomain: 'valorizacionescieec.firebaseapp.com',
  projectId: 'valorizacionescieec',
  storageBucket: 'valorizacionescieec.firebasestorage.app',
  messagingSenderId: '1073460981091',
  appId: '1:1073460981091:web:d96080b6729f4db65b3756'
};

const app = initializeApp(config);
const db = getFirestore(app);

// Helpers
function fecha(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().split('T')[0];
}
function ts(diasAtras = 0) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString();
}

async function main() {
  // Cargar cuadrillas y partidas
  console.log('Cargando cuadrillas y partidas...');
  const cuadSnap = await getDocs(collection(db, 'cuadrillas'));
  const cuadrillas = {};
  cuadSnap.docs.forEach(d => { cuadrillas[d.data().nombre] = { id: d.id, ...d.data() }; });

  const partSnap = await getDocs(collection(db, 'partidas'));
  const partidas = {};
  partSnap.docs.forEach(d => { partidas[d.data().codigo] = { id: d.id, ...d.data() }; });

  console.log(`Cuadrillas: ${Object.keys(cuadrillas).length}, Partidas: ${Object.keys(partidas).length}`);

  // Referencias rápidas
  const C = cuadrillas;
  const P = partidas;

  // ─── CREAR OMs ────────────────────────────────────────────────────────────────
  console.log('\nCreando Órdenes de Mantenimiento...');

  async function crearOM(numero, desc, zona, cuads, diasAtras) {
    const cuadIds = cuads.map(n => C[n].id);
    const cuadNombres = cuads.map(n => C[n].nombre);
    const ref = await addDoc(collection(db, 'ordenes_mantenimiento'), {
      numero_om: numero,
      descripcion: desc,
      zona,
      estado: 'activa',
      cuadrillas_ids: cuadIds,
      cuadrillas_nombres: cuadNombres,
      creador_id: C[cuads[0]].supervisorId,
      creador_nombre: C[cuads[0]].supervisorNombre,
      fecha_emision: fecha(diasAtras),
      total_valorizado: 0,
      createdAt: ts(diasAtras),
    });
    console.log(`  ✓ OM ${numero} — ${desc}`);
    return ref.id;
  }

  async function addItem(omId, cuadNombre, partCodigo, cantidad, diasAtras, obs = '') {
    const cuad = C[cuadNombre];
    const part = P[partCodigo];
    if (!part) { console.log(`  ⚠ Partida ${partCodigo} no encontrada`); return; }
    const subtotal = cantidad * part.precio_unitario;
    await addDoc(collection(db, 'items_om'), {
      orden_id: omId,
      cuadrilla_id: cuad.id,
      cuadrilla_nombre: cuad.nombre,
      supervisor_id: cuad.supervisorId,
      supervisor_nombre: cuad.supervisorNombre,
      partida_id: part.id,
      codigo: part.codigo,
      descripcion: part.descripcion,
      unidad: part.unidad,
      categoria: part.categoria,
      cantidad,
      precio_unitario: part.precio_unitario,
      subtotal,
      fecha_ejecucion: fecha(diasAtras),
      observaciones: obs,
      createdAt: ts(diasAtras),
    });
    // Update total
    const omRef = doc(db, 'ordenes_mantenimiento', omId);
    const omSnap = await getDoc(omRef);
    const current = omSnap.data().total_valorizado || 0;
    await updateDoc(omRef, { total_valorizado: current + subtotal });
    return subtotal;
  }

  // ══════════════════════════════════════════════════════
  // OM 1 — Cambio de postes BT (2 cuadrillas trabajan juntas)
  // ══════════════════════════════════════════════════════
  const om1 = await crearOM('500623447', 'Cambio de postes BT y conductores – Jr. Las Flores', 'Tarma Centro',
    ['BT-01 Tarma', 'BT-02 Tarma'], 7);
  // BT-01 Tarma registra 3 días
  await addItem(om1, 'BT-01 Tarma', 'BT-001', 3, 7, 'Día 1 - zona norte');
  await addItem(om1, 'BT-01 Tarma', 'BT-003', 2, 7);
  await addItem(om1, 'BT-01 Tarma', 'BT-001', 4, 6, 'Día 2 - zona sur');
  await addItem(om1, 'BT-01 Tarma', 'BT-004', 1, 6);
  await addItem(om1, 'BT-01 Tarma', 'BT-002', 5, 5, 'Día 3 - finalización');
  // BT-02 Tarma también registra en la misma OM
  await addItem(om1, 'BT-02 Tarma', 'BT-005', 2, 7, 'Apoyo cuadrilla 2');
  await addItem(om1, 'BT-02 Tarma', 'BT-008', 3, 6);
  await addItem(om1, 'BT-02 Tarma', 'BT-010', 1, 5);

  // ══════════════════════════════════════════════════════
  // OM 2 — Instalación AP sector Los Olivos
  // ══════════════════════════════════════════════════════
  const om2 = await crearOM('500623521', 'Instalación y mantenimiento AP – Sector Los Olivos', 'Tarma Norte',
    ['AP-01 Tarma'], 6);
  await addItem(om2, 'AP-01 Tarma', 'AP-001', 15, 6, 'Inspección inicial sector');
  await addItem(om2, 'AP-01 Tarma', 'AP-003', 8, 5);
  await addItem(om2, 'AP-01 Tarma', 'AP-005', 5, 5);
  await addItem(om2, 'AP-01 Tarma', 'AP-002', 6, 4);
  await addItem(om2, 'AP-01 Tarma', 'AP-007', 3, 4);

  // ══════════════════════════════════════════════════════
  // OM 3 — Mantenimiento MT zona industrial Huancayo
  // ══════════════════════════════════════════════════════
  const om3 = await crearOM('500634102', 'Mantenimiento red MT zona industrial', 'Huancayo Industrial',
    ['MT-01 Huancayo'], 5);
  await addItem(om3, 'MT-01 Huancayo', 'MT-001', 2, 5, 'Tramo principal');
  await addItem(om3, 'MT-01 Huancayo', 'MT-003', 4, 5);
  await addItem(om3, 'MT-01 Huancayo', 'MT-005', 1, 4);
  await addItem(om3, 'MT-01 Huancayo', 'MT-002', 3, 4);
  await addItem(om3, 'MT-01 Huancayo', 'MT-007', 2, 3);

  // ══════════════════════════════════════════════════════
  // OM 4 — Renovación luminarias AP centro Huancayo
  // ══════════════════════════════════════════════════════
  const om4 = await crearOM('500634215', 'Renovación de luminarias AP – Centro histórico', 'Huancayo Centro',
    ['BT-01 Huancayo'], 5);
  await addItem(om4, 'BT-01 Huancayo', 'AP-004', 20, 5, 'Cambio masivo luminarias');
  await addItem(om4, 'BT-01 Huancayo', 'AP-006', 10, 4);
  await addItem(om4, 'BT-01 Huancayo', 'AP-008', 5, 3);

  // ══════════════════════════════════════════════════════
  // OM 5 — Ampliación red BT Chanchamayo
  // ══════════════════════════════════════════════════════
  const om5 = await crearOM('500641883', 'Ampliación red BT – Urb. Los Pinos', 'Chanchamayo Norte',
    ['BT-01 Chanchamayo'], 4);
  await addItem(om5, 'BT-01 Chanchamayo', 'BT-001', 5, 4, 'Extensión red existente');
  await addItem(om5, 'BT-01 Chanchamayo', 'BT-006', 2, 4);
  await addItem(om5, 'BT-01 Chanchamayo', 'BT-009', 3, 3);
  await addItem(om5, 'BT-01 Chanchamayo', 'BT-003', 4, 3);
  await addItem(om5, 'BT-01 Chanchamayo', 'BT-011', 1, 2);

  // ══════════════════════════════════════════════════════
  // OM 6 — Reposición postes caídos EMERGENCIA (2 cuadrillas)
  // ══════════════════════════════════════════════════════
  const om6 = await crearOM('500641901', 'Emergencia – Reposición postes caídos por lluvia', 'Chanchamayo Sur',
    ['BT-01 Chanchamayo', 'BT-02 Chanchamayo'], 3);
  await addItem(om6, 'BT-01 Chanchamayo', 'BT-002', 4, 3, 'Emergencia día 1');
  await addItem(om6, 'BT-01 Chanchamayo', 'BT-004', 2, 3);
  await addItem(om6, 'BT-02 Chanchamayo', 'BT-001', 3, 3, 'Refuerzo cuadrilla 2');
  await addItem(om6, 'BT-02 Chanchamayo', 'BT-007', 4, 2);
  await addItem(om6, 'BT-02 Chanchamayo', 'BT-012', 2, 2);

  // ══════════════════════════════════════════════════════
  // OM 7 — Instalación SED nueva urb. Junín
  // ══════════════════════════════════════════════════════
  const om7 = await crearOM('500651234', 'Instalación SED nueva – Urb. Santa Rosa', 'Junín Sur',
    ['MT-01 Junín'], 3);
  await addItem(om7, 'MT-01 Junín', 'SED-001', 1, 3, 'Instalación SED completa');
  await addItem(om7, 'MT-01 Junín', 'SED-003', 2, 3);
  await addItem(om7, 'MT-01 Junín', 'MT-004', 3, 2);

  // ══════════════════════════════════════════════════════
  // OM 8 — Mantenimiento red MT sector norte Junín
  // ══════════════════════════════════════════════════════
  const om8 = await crearOM('500651301', 'Mantenimiento preventivo MT – Sector Norte', 'Junín Norte',
    ['MT-01 Junín'], 2);
  await addItem(om8, 'MT-01 Junín', 'MT-001', 3, 2);
  await addItem(om8, 'MT-01 Junín', 'MT-006', 2, 2);
  await addItem(om8, 'MT-01 Junín', 'MT-008', 1, 1);

  // ══════════════════════════════════════════════════════
  // OM 9 — Cambio conductores BT deteriorados Tarma
  // ══════════════════════════════════════════════════════
  const om9 = await crearOM('500623890', 'Cambio conductores BT deteriorados – Barrio San Pedro', 'Tarma Sur',
    ['BT-01 Tarma'], 2);
  await addItem(om9, 'BT-01 Tarma', 'BT-013', 6, 2, 'Tramo deteriorado por antigüedad');
  await addItem(om9, 'BT-01 Tarma', 'BT-003', 4, 2);
  await addItem(om9, 'BT-01 Tarma', 'BT-015', 2, 1);

  // ══════════════════════════════════════════════════════
  // OM 10 — AP Alumbrado masivo Huancayo (hoy)
  // ══════════════════════════════════════════════════════
  const om10 = await crearOM('500634500', 'Inspección y reposición AP – Circuito 12 Huancayo', 'Huancayo Este',
    ['BT-01 Huancayo', 'SED-01 Huancayo'], 1);
  await addItem(om10, 'BT-01 Huancayo', 'AP-001', 12, 1, 'Inspección circuito 12 - inicio');
  await addItem(om10, 'BT-01 Huancayo', 'AP-003', 5, 1);
  await addItem(om10, 'SED-01 Huancayo', 'SED-002', 1, 1, 'Revisión SED afectada');

  // ══════════════════════════════════════════════════════
  // TRABAJOS LIBRES
  // ══════════════════════════════════════════════════════
  console.log('\nCreando Trabajos Libres...');

  // TL 1: BT-02 Tarma — Emergencia sin OM (pendiente, para demostrar afiliación)
  const tl1Ref = await addDoc(collection(db, 'trabajos_libres'), {
    cuadrilla_id: C['BT-02 Tarma'].id,
    cuadrilla_nombre: 'BT-02 Tarma',
    supervisor_id: C['BT-02 Tarma'].supervisorId,
    supervisor_nombre: C['BT-02 Tarma'].supervisorNombre,
    descripcion: 'Emergencia nocturna – poste caído Jr. Pumacahua',
    fecha: fecha(2),
    estado: 'pendiente',
    total_valorizado: 0,
    createdAt: ts(2),
  });
  const tl1_p1 = {
    trabajo_libre_id: tl1Ref.id, cuadrilla_id: C['BT-02 Tarma'].id,
    supervisor_id: C['BT-02 Tarma'].supervisorId,
    partida_id: P['BT-002'].id, codigo: 'BT-002',
    descripcion: P['BT-002'].descripcion, unidad: P['BT-002'].unidad,
    categoria: 'BT', cantidad: 2, precio_unitario: P['BT-002'].precio_unitario,
    subtotal: 2 * P['BT-002'].precio_unitario, fecha_ejecucion: fecha(2),
    observaciones: 'Emergencia nocturna, sin OM disponible', createdAt: ts(2),
  };
  const tl1_p2 = {
    trabajo_libre_id: tl1Ref.id, cuadrilla_id: C['BT-02 Tarma'].id,
    supervisor_id: C['BT-02 Tarma'].supervisorId,
    partida_id: P['BT-001'].id, codigo: 'BT-001',
    descripcion: P['BT-001'].descripcion, unidad: P['BT-001'].unidad,
    categoria: 'BT', cantidad: 3, precio_unitario: P['BT-001'].precio_unitario,
    subtotal: 3 * P['BT-001'].precio_unitario, fecha_ejecucion: fecha(2),
    observaciones: '', createdAt: ts(2),
  };
  await addDoc(collection(db, 'items_tl'), tl1_p1);
  await addDoc(collection(db, 'items_tl'), tl1_p2);
  const totalTL1 = tl1_p1.subtotal + tl1_p2.subtotal;
  await updateDoc(tl1Ref, { total_valorizado: totalTL1 });
  console.log(`  ✓ TL1 (Pendiente) - ${C['BT-02 Tarma'].supervisorNombre}: S/ ${totalTL1.toFixed(2)}`);

  // TL 2: AP-01 Chanchamayo — Cambio masivo lámparas (pendiente)
  const tl2Ref = await addDoc(collection(db, 'trabajos_libres'), {
    cuadrilla_id: C['AP-01 Chanchamayo'].id,
    cuadrilla_nombre: 'AP-01 Chanchamayo',
    supervisor_id: C['AP-01 Chanchamayo'].supervisorId,
    supervisor_nombre: C['AP-01 Chanchamayo'].supervisorNombre,
    descripcion: 'Cambio masivo de lámparas – Sector Mercado Central',
    fecha: fecha(1),
    estado: 'pendiente',
    total_valorizado: 0,
    createdAt: ts(1),
  });
  const tl2_p1 = {
    trabajo_libre_id: tl2Ref.id, cuadrilla_id: C['AP-01 Chanchamayo'].id,
    supervisor_id: C['AP-01 Chanchamayo'].supervisorId,
    partida_id: P['AP-004'].id, codigo: 'AP-004',
    descripcion: P['AP-004'].descripcion, unidad: P['AP-004'].unidad,
    categoria: 'AP', cantidad: 18, precio_unitario: P['AP-004'].precio_unitario,
    subtotal: 18 * P['AP-004'].precio_unitario, fecha_ejecucion: fecha(1),
    observaciones: 'Lámpara LED - reemplazo masivo mercado', createdAt: ts(1),
  };
  const tl2_p2 = {
    trabajo_libre_id: tl2Ref.id, cuadrilla_id: C['AP-01 Chanchamayo'].id,
    supervisor_id: C['AP-01 Chanchamayo'].supervisorId,
    partida_id: P['AP-001'].id, codigo: 'AP-001',
    descripcion: P['AP-001'].descripcion, unidad: P['AP-001'].unidad,
    categoria: 'AP', cantidad: 18, precio_unitario: P['AP-001'].precio_unitario,
    subtotal: 18 * P['AP-001'].precio_unitario, fecha_ejecucion: fecha(1),
    observaciones: '', createdAt: ts(1),
  };
  await addDoc(collection(db, 'items_tl'), tl2_p1);
  await addDoc(collection(db, 'items_tl'), tl2_p2);
  const totalTL2 = tl2_p1.subtotal + tl2_p2.subtotal;
  await updateDoc(tl2Ref, { total_valorizado: totalTL2 });
  console.log(`  ✓ TL2 (Pendiente) - ${C['AP-01 Chanchamayo'].supervisorNombre}: S/ ${totalTL2.toFixed(2)}`);

  // TL 3: MT-01 Huancayo — ya afiliado a OM 500634102 (para mostrar flujo completo)
  const tl3Ref = await addDoc(collection(db, 'trabajos_libres'), {
    cuadrilla_id: C['MT-01 Huancayo'].id,
    cuadrilla_nombre: 'MT-01 Huancayo',
    supervisor_id: C['MT-01 Huancayo'].supervisorId,
    supervisor_nombre: C['MT-01 Huancayo'].supervisorNombre,
    descripcion: 'Revisión urgente seccionadores – zona industrial',
    fecha: fecha(6),
    estado: 'afiliado',
    orden_id_afiliada: om3,
    numero_om_afiliada: '500634102',
    fecha_afiliacion: ts(5),
    total_valorizado: 0,
    createdAt: ts(6),
  });
  const tl3_p1 = {
    trabajo_libre_id: tl3Ref.id, cuadrilla_id: C['MT-01 Huancayo'].id,
    supervisor_id: C['MT-01 Huancayo'].supervisorId,
    partida_id: P['MT-009'].id, codigo: 'MT-009',
    descripcion: P['MT-009']?.descripcion || 'Mantenimiento MT', unidad: P['MT-009']?.unidad || 'und',
    categoria: 'MT', cantidad: 2, precio_unitario: P['MT-009']?.precio_unitario || 250,
    subtotal: 2 * (P['MT-009']?.precio_unitario || 250), fecha_ejecucion: fecha(6),
    observaciones: 'Trabajo previo a llegada de OM, afiliado luego', createdAt: ts(6),
  };
  await addDoc(collection(db, 'items_tl'), tl3_p1);
  const totalTL3 = tl3_p1.subtotal;
  await updateDoc(tl3Ref, { total_valorizado: totalTL3 });
  console.log(`  ✓ TL3 (Afiliado a OM 500634102) - ${C['MT-01 Huancayo'].supervisorNombre}: S/ ${totalTL3.toFixed(2)}`);

  // Calcular total general
  const omSnaps = await getDocs(collection(db, 'ordenes_mantenimiento'));
  let totalGeneral = 0;
  omSnaps.docs.forEach(d => { totalGeneral += d.data().total_valorizado || 0; });
  totalGeneral += totalTL1 + totalTL2;

  console.log('\n════════════════════════════════════════════');
  console.log('🎉 ESCENARIO DEMO CREADO EXITOSAMENTE');
  console.log('════════════════════════════════════════════');
  console.log(`📋 OMs creadas: 10`);
  console.log(`📝 Trabajos Libres: 3 (2 pendientes, 1 afiliado)`);
  console.log(`💰 Total valorizado: S/ ${totalGeneral.toFixed(2)}`);
  console.log('════════════════════════════════════════════');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
