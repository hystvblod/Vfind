// === firebase.js ===

// Firebase 11.x en module (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// Configuration du projet Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2AttV3LYAsWShgIMEPIvfpc6wmPpsK3U",
  authDomain: "vfind-12866.firebaseapp.com",
  projectId: "vfind-12866",
  storageBucket: "vfind-12866.appspot.com",
  messagingSenderId: "953801570333",
  appId: "1:953801570333:web:92ed5e604d0df316046ef4",
  measurementId: "G-WTSN5KCBDJ"
};

// Initialisation Firebase (à faire UNE fois)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connexion + création profil avec parrainage
export async function initFirebaseUser() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const ref = doc(db, "users", uid);
        let snap = await getDoc(ref);

        // Si pas encore de compte => on le crée
        if (!snap.exists()) {
          const params = new URLSearchParams(window.location.search);
          let parrain = null;

          if (params.has("parrain") && params.get("parrain") !== uid) {
            parrain = params.get("parrain");
            const refParrain = doc(db, "users", parrain);
            const snapParrain = await getDoc(refParrain);
            if (snapParrain.exists()) {
              const dataParrain = snapParrain.data();
              const nbFilleuls = (dataParrain.filleuls || 0) + 1;
              const newPoints = (dataParrain.points || 0) + 300;
              const cadres = dataParrain.cadres || [];

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

          await setDoc(ref, {
            pseudo: "Joueur",
            points: 100,
            jetons: 3,
            cadres: [],
            cadreActif: null,
            filleuls: 0,
            amis: [],
            demandesRecues: [],
            demandesEnvoyees: [],
            photoProfil: "",
            pseudoPublic: "",
            idFixe: false,
             premium: false,
            ...(parrain ? { parrain: parrain } : {})
          });
        }

        resolve(user);
      } else {
        await signInAnonymously(auth);
      }
    });
  });
}

// Export global
export { app, auth, db };
