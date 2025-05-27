// === firebase.js (VFind PRO, id public = clé doc Firestore, gestion photos aimées) ===

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// -- Config Firebase --
const firebaseConfig = {
  apiKey: "AIzaSyD2AttV3LYAsWShgIMEPIvfpc6wmPpsK3U",
  authDomain: "vfind-12866.firebaseapp.com",
  projectId: "vfind-12866",
  storageBucket: "vfind-12866.appspot.com",
  messagingSenderId: "953801570333",
  appId: "1:953801570333:web:92ed5e604d0df316046ef4",
  measurementId: "G-WTSN5KCBDJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Génère un pseudoPublic unique (clé Firestore)
async function generateUniquePseudoPublic() {
  let tempID = randomTempID();
  let taken = true;
  while (taken) {
    const ref = doc(db, "users", tempID);
    const snap = await getDoc(ref);
    if (!snap.exists()) taken = false;
    else tempID = randomTempID();
  }
  return tempID;
}
function randomTempID() {
  const rand = Math.random().toString(36).substring(2, 7);
  return "user_" + rand;
}

// Initialise et connecte l'utilisateur Firebase (création si besoin)
export async function initFirebaseUser() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) user = (await signInAnonymously(auth)).user;
        let pseudoPublic = localStorage.getItem('pseudoPublic');
        let needCreate = false;

        if (!pseudoPublic) {
          pseudoPublic = await generateUniquePseudoPublic();
          localStorage.setItem('pseudoPublic', pseudoPublic);
          needCreate = true;
        }

        const ref = doc(db, "users", pseudoPublic);
        let snap = await getDoc(ref);

        if (!snap.exists() || needCreate) {
          const dateInscription = new Date().toISOString();
          await setDoc(ref, {
            pseudoPublic: pseudoPublic,
            points: 100,
            jetons: 3,
            cadres: ["polaroid_01", "polaroid_02"],
            cadreActif: "polaroid_01",
            premium: false,
            filleuls: 0,
            amis: [],
            demandesRecues: [],
            demandesEnvoyees: [],
            historique: [],
            historiqueDuel: [],
            dateInscription,
            photosAimees: [],
            // Ajoute ici tout champ voulu
          });
        }

        resolve(pseudoPublic);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Accès direct au doc utilisateur courant (via pseudoPublic localStorage)
async function getUserRef() {
  const pseudoPublic = localStorage.getItem('pseudoPublic');
  if (!pseudoPublic) throw "Utilisateur non initialisé !";
  return doc(db, "users", pseudoPublic);
}

// ===================
// FONCTIONS UTILISATEUR
// ===================

// Points (Vcoins)
export async function getPoints() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().points || 0) : 0;
}
export async function addPoints(n) {
  const ref = await getUserRef();
  const points = await getPoints();
  await updateDoc(ref, { points: points + n });
}
export async function removePoints(n) {
  const points = await getPoints();
  if (points < n) return false;
  const ref = await getUserRef();
  await updateDoc(ref, { points: points - n });
  return true;
}

// Jetons
export async function getJetons() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().jetons || 0) : 0;
}
export async function addJetons(n) {
  const ref = await getUserRef();
  const jetons = await getJetons();
  await updateDoc(ref, { jetons: jetons + n });
}
export async function removeJeton() {
  const jetons = await getJetons();
  if (jetons <= 0) return false;
  const ref = await getUserRef();
  await updateDoc(ref, { jetons: jetons - 1 });
  return true;
}

// Cadres possédés et sélectionné
export async function getCadresPossedes() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().cadres || []) : [];
}
export async function possedeCadre(id) {
  const cadres = await getCadresPossedes();
  return cadres.includes(id);
}
export async function acheterCadre(id) {
  const ref = await getUserRef();
  await updateDoc(ref, { cadres: arrayUnion(id) });
}
export async function getCadreSelectionne() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().cadreActif || "polaroid_01") : "polaroid_01";
}
export async function setCadreSelectionne(id) {
  const ref = await getUserRef();
  await updateDoc(ref, { cadreActif: id });
}

// Historique SOLO/DUEL
export async function sauvegarderPhoto(base64, defi) {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  const historique = snap.exists() ? (snap.data().historique || []) : [];
  historique.push({ base64, defi, date: new Date().toISOString() });
  await updateDoc(ref, { historique });
}
export async function getHistoriquePhotos() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().historique || []) : [];
}
export async function getHistoriqueDuel() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().historiqueDuel || []) : [];
}

// Premium
export async function isPremium() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().premium === true) : false;
}
export async function setPremium(status) {
  const ref = await getUserRef();
  await updateDoc(ref, { premium: !!status });
}

// --- PHOTOS AIMÉES (like/unlike une photo, gestion tableau) ---
export async function likePhoto(photoId) {
  const ref = await getUserRef();
  await updateDoc(ref, { photosAimees: arrayUnion(photoId) });
}
export async function unlikePhoto(photoId) {
  const ref = await getUserRef();
  await updateDoc(ref, { photosAimees: arrayRemove(photoId) });
}
export async function getPhotosAimees() {
  const ref = await getUserRef();
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().photosAimees || []) : [];
}

// --- PATCH INFOS (modification partielle profil) ---
export async function updateUserData(update) {
  const ref = await getUserRef();
  await updateDoc(ref, update);
}

export {
  db, auth, getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove
};
