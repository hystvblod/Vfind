
// import_defis.js — Importe les défis depuis defis.json vers Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc } from 'firebase/firestore';
import fs from 'fs/promises';

// 🔐 CONFIG FIREBASE — À REMPLIR AVEC TES INFOS FIREBASE !
const firebaseConfig = {
  apiKey: "AIzaSyD2AttV3LYAsWShgIMEPIvfpc6wmPpsK3U",
  authDomain: "vfind-12866.firebaseapp.com",
  projectId: "vfind-12866",
  storageBucket: "vfind-12866.firebasestorage.app",
  messagingSenderId: "953801570333",
  appId: "1:953801570333:web:92ed5e604d0df316046ef4",
  measurementId: "G-WTSN5KCBDJ"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Charger les défis depuis defis.json
const rawData = await fs.readFile('./defis.json', 'utf-8');
const defis = JSON.parse(rawData).defis;

console.log(`📦 ${defis.length} défis à importer...`);

for (const defi of defis) {
  const id = defi.id.toString();
  await setDoc(doc(db, "defis", id), defi);
  console.log(`✅ Défi importé : ${id}`);
}

console.log("✅ Tous les défis ont été importés !");
