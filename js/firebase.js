// === firebase.js ===

// Firebase 11.x en module (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// Configuration de ton projet Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2AttV3LYAsWShgIMEPIvfpc6wmPpsK3U",
  authDomain: "vfind-12866.firebaseapp.com",
  projectId: "vfind-12866",
  storageBucket: "vfind-12866.appspot.com",
  messagingSenderId: "953801570333",
  appId: "1:953801570333:web:92ed5e604d0df316046ef4",
  measurementId: "G-WTSN5KCBDJ"
};

// Initialisation Firebase (à faire UNE SEULE FOIS !)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connexion anonyme automatique + création profil (si besoin)
export async function initFirebaseUser() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const profilRef = doc(db, "users", uid);
        const snap = await getDoc(profilRef);

        if (!snap.exists()) {
          // Création du profil avec données par défaut
          await setDoc(profilRef, {
            pseudo: "Joueur",
            points: 100,
            jetons: 3,
            amis: [],
            demandesRecues: [],
            demandesEnvoyees: [],
            photoProfil: ""
          });
          console.log("✔️ Nouveau profil créé :", uid);
        } else {
          console.log("🔁 Profil déjà existant :", uid);
        }
        resolve(user); // Callback si besoin
      } else {
        await signInAnonymously(auth);
      }
    });
  });
}

// Exporte tout ce dont tu as besoin
export { app, auth, db };
