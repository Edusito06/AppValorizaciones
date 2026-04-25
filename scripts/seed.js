// Seed script para poblar Firebase con datos beta
// Run: node scripts/seed.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc, getDocs, deleteDoc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyBEwqPx-6Tx8tUei63qg_lZGO3UHNW51Ok",
  authDomain: "valorizacionescieec-6d47c.firebaseapp.com",
  projectId: "valorizacionescieec-6d47c",
  storageBucket: "valorizacionescieec-6d47c.firebasestorage.app",
  messagingSenderId: "694667129172",
  appId: "1:694667129172:web:08d242f854eed4bd7758c1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ─── CUADRILLAS Y SUPERVISORES BETA ─────────────────────────────────────────
const cuadrillasData = [
  // TARMA
  { nombre: 'BT-01 Tarma', provincia: 'Tarma', supervisor: 'Carlos Quispe Huamán', email: 'c.quispe@empresa.pe' },
  { nombre: 'BT-02 Tarma', provincia: 'Tarma', supervisor: 'Juan Flores Ramos', email: 'j.flores@empresa.pe' },
  { nombre: 'MT-01 Tarma', provincia: 'Tarma', supervisor: 'Pedro Ramos Ccahua', email: 'p.ramos@empresa.pe' },
  { nombre: 'AP-01 Tarma', provincia: 'Tarma', supervisor: 'Luis Huamán Torres', email: 'l.huaman@empresa.pe' },
  // HUANCAYO
  { nombre: 'BT-01 Huancayo', provincia: 'Huancayo', supervisor: 'Miguel Torres Vásquez', email: 'm.torres@empresa.pe' },
  { nombre: 'MT-01 Huancayo', provincia: 'Huancayo', supervisor: 'Ángel Céspedes Lima', email: 'a.cespedes@empresa.pe' },
  { nombre: 'SED-01 Huancayo', provincia: 'Huancayo', supervisor: 'Roberto Díaz Palomino', email: 'r.diaz@empresa.pe' },
  // JUNÍN
  { nombre: 'BT-01 Junín', provincia: 'Junín', supervisor: 'César Prado Quispe', email: 'c.prado@empresa.pe' },
  { nombre: 'MT-01 Junín', provincia: 'Junín', supervisor: 'Héctor Lazo Contreras', email: 'h.lazo@empresa.pe' },
  // CHANCHAMAYO
  { nombre: 'BT-01 Chanchamayo', provincia: 'Chanchamayo', supervisor: 'Jhon Villanueva Ore', email: 'j.villanueva@empresa.pe' },
  { nombre: 'BT-02 Chanchamayo', provincia: 'Chanchamayo', supervisor: 'David Asto Camayo', email: 'd.asto@empresa.pe' },
  { nombre: 'AP-01 Chanchamayo', provincia: 'Chanchamayo', supervisor: 'Marcos Ríos Huanca', email: 'm.rios@empresa.pe' },
];

const PASSWORD = process.env.SEED_PASSWORD;
const ADMIN_EMAIL = 'admin@empresa.pe';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!PASSWORD || !ADMIN_PASSWORD) {
  console.error('ERROR: Debes definir SEED_PASSWORD y SEED_ADMIN_PASSWORD antes de ejecutar el seed.');
  console.error('Ejemplo: SEED_PASSWORD=xxx SEED_ADMIN_PASSWORD=yyy node scripts/seed.js');
  process.exit(1);
}

async function seedPartidas() {
  console.log('\n📋 Cargando partidas...');
  const partidasPath = path.join(__dirname, '..', 'partidas_data.json');
  const partidas = JSON.parse(fs.readFileSync(partidasPath, 'utf-8'));

  let count = 0;
  for (const p of partidas) {
    await addDoc(collection(db, 'partidas'), {
      codigo: p.codigo,
      descripcion: p.descripcion,
      unidad: p.unidad,
      categoria: p.categoria,
      precio_unitario: p.precio_unitario,
      codigo_sap: p.codigo_sap,
    });
    count++;
    if (count % 20 === 0) console.log(`  ${count}/${partidas.length} partidas cargadas...`);
  }
  console.log(`✅ ${count} partidas cargadas`);
}

async function seedCuadrillasYUsuarios() {
  console.log('\n👥 Creando cuadrillas y supervisores...');

  for (const cuad of cuadrillasData) {
    try {
      // Create Firebase Auth user
      let uid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, cuad.email, PASSWORD);
        uid = cred.user.uid;
        console.log(`  ✓ Usuario creado: ${cuad.email}`);
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, cuad.email, PASSWORD);
          uid = cred.user.uid;
          console.log(`  ↺ Usuario ya existe: ${cuad.email}`);
        } else { throw e; }
      }

      // Create cuadrilla doc
      const cuadRef = await addDoc(collection(db, 'cuadrillas'), {
        nombre: cuad.nombre,
        provincia: cuad.provincia,
        supervisorId: uid,
        supervisorNombre: cuad.supervisor,
        supervisorEmail: cuad.email,
      });

      // Create user doc
      await setDoc(doc(db, 'users', uid), {
        nombre: cuad.supervisor,
        email: cuad.email,
        rol: 'supervisor',
        cuadrillaId: cuadRef.id,
        cuadrillaNombre: cuad.nombre,
        provincia: cuad.provincia,
      });

      console.log(`  ✓ Cuadrilla "${cuad.nombre}" configurada`);
    } catch (e) {
      console.error(`  ✗ Error con ${cuad.nombre}:`, e.message);
    }
  }
}

async function seedAdmin() {
  console.log('\n🔑 Creando Super Admin...');
  try {
    let uid;
    try {
      const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      uid = cred.user.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        uid = cred.user.uid;
        console.log('  ↺ Admin ya existe');
      } else { throw e; }
    }
    await setDoc(doc(db, 'users', uid), {
      nombre: 'Administrador CIEEC',
      email: ADMIN_EMAIL,
      rol: 'superadmin',
    });
    console.log('✅ Super Admin configurado');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (e) {
    console.error('✗ Error creando admin:', e.message);
  }
}

async function main() {
  console.log('🚀 Iniciando seed de Firebase...');
  console.log('📡 Proyecto: valorizacionescieec');

  // Check if partidas already exist
  const snap = await getDocs(collection(db, 'partidas'));
  if (snap.size > 0) {
    console.log(`\n⚠️  Ya existen ${snap.size} partidas en Firestore.`);
    console.log('   Saltando carga de partidas. Si quieres recargar, limpia la colección primero.\n');
  } else {
    await seedPartidas();
  }

  const cuadSnap = await getDocs(collection(db, 'cuadrillas'));
  if (cuadSnap.size > 0) {
    console.log(`\n⚠️  Ya existen ${cuadSnap.size} cuadrillas en Firestore.`);
    console.log('   Saltando. Si quieres recargar, limpia las colecciones primero.\n');
  } else {
    await seedCuadrillasYUsuarios();
  }

  await seedAdmin();

  console.log('\n🎉 Seed completado!');
  console.log('\n📱 Credenciales de acceso beta:');
  console.log('─────────────────────────────────────');
  console.log('ADMIN:');
  console.log(`  Email   : ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('\nSUPERVISORES (todos con password: Pass2025!):');
  cuadrillasData.forEach(c => {
    console.log(`  ${c.supervisor.padEnd(25)} ${c.email}`);
  });
  console.log('─────────────────────────────────────');
  process.exit(0);
}

main().catch(e => { console.error('Error fatal:', e); process.exit(1); });
