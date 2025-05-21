// === firebase.js (VFind PRO, initialisation et gestion utilisateur unique) ===

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// -- Config Firebase à personnaliser si besoin --
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

// --- Génère un pseudoPublic unique ---
async function generateUniquePseudoPublic() {
  let tempID = randomTempID();
  let taken = true;
  while (taken) {
    const q = query(collection(db, "users"), where("pseudoPublic", "==", tempID));
    const res = await getDocs(q);
    if (res.empty) taken = false;
    else tempID = randomTempID();
  }
  return tempID;
}
function randomTempID() {
  const rand = Math.random().toString(36).substring(2, 7);
  return "user_" + rand;
}

// --- Initialise et connecte l'utilisateur Firebase ---
//   => Retourne l'objet utilisateur complet (promesse)
export async function initFirebaseUser() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) user = (await signInAnonymously(auth)).user;
        const uid = user.uid;
        const ref = doc(db, "users", uid);
        let snap = await getDoc(ref);

        // Création auto du profil avec ID unique si non-existant
        if (!snap.exists()) {
          const urlParams = new URLSearchParams(window.location.search);
          let parrain = null;
          if (urlParams.has('parrain') && urlParams.get('parrain') !== uid) {
            parrain = urlParams.get('parrain');
            // Ajout points/cadre à l'utilisateur parrain
            const refParrain = doc(db, "users", parrain);
            const snapParrain = await getDoc(refParrain);
            if (snapParrain.exists()) {
              const dataParrain = snapParrain.data();
              let nbFilleuls = (dataParrain.filleuls || 0) + 1;
              let newPoints = (dataParrain.points || 0) + 300;
              let cadres = dataParrain.cadres || [];
              if (nbFilleuls === 3 && !cadres.includes("polaroid_302")) {
                cadres.push("polaroid_302");
              }
              await updateDoc(refParrain, {
                filleuls: nbFilleuls,
                points: newPoints,
                cadres: cadres
              });
            }
          }

          // Génère un pseudoPublic unique
          const pseudoPublic = await generateUniquePseudoPublic();

          await setDoc(ref, {
            pseudo: "Joueur",
            points: 100,
            jetons: 3,
            cadres: ["polaroid_01", "polaroid_02"],
            cadreActif: "polaroid_01",
            premium: false,
            filleuls: 0,
            amis: [],
            demandesRecues: [],
            demandesEnvoyees: [],
            photoProfil: "",
            pseudoPublic: pseudoPublic,  // <-- ID unique généré et stocké !
            idFixe: false,
            ...(parrain ? { parrain: parrain } : {})
          });
          snap = await getDoc(ref);
        }
        resolve(user);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Export des outils Firebase pour les autres fichiers/appels
export { db, auth, getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onAuthStateChanged, signInAnonymously };
