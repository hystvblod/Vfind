// === amis.js (version PRO tout Firebase) ===
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Initialisation Firebase
const db = getFirestore();
const auth = getAuth();
let currentUser = null;

// On récupère l'utilisateur connecté
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    listenUserData(); // Listen les updates temps réel de ses amis/demandes
  } else {
    // Redirige si pas connecté
    window.location.href = "login.html";
  }
});

// Ecoute en temps réel des données utilisateur
function listenUserData() {
  const userRef = doc(db, "users", currentUser.uid);
  onSnapshot(userRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    afficherListesAmis(data);
  });
}

// Affiche la liste des amis et demandes
function afficherListesAmis(data) {
  // Amis
  const ulAmis = document.getElementById("liste-amis");
  if (ulAmis) {
    ulAmis.innerHTML = "";
    if (!data.amis || data.amis.length === 0) {
      ulAmis.innerHTML = "<li>Pas d'ami pour le moment.</li>";
    } else {
      data.amis.forEach(pseudo => {
        ulAmis.innerHTML += `
          <li>
            ${pseudo} 
            <button onclick="defierAmi('${pseudo}')">Défier</button> 
            <button onclick="supprimerAmi('${pseudo}')">❌</button>
          </li>`;
      });
    }
  }

  // Demandes reçues
  const ulRecues = document.getElementById("liste-demandes-recues");
  if (ulRecues) {
    ulRecues.innerHTML = "";
    if (!data.demandesRecues || data.demandesRecues.length === 0) {
      ulRecues.innerHTML = "<li>Aucune demande reçue.</li>";
    } else {
      data.demandesRecues.forEach(pseudo => {
        ulRecues.innerHTML += `
          <li>
            ${pseudo} 
            <button onclick="accepterDemande('${pseudo}')">Accepter</button> 
            <button onclick="refuserDemande('${pseudo}')">Refuser</button>
          </li>`;
      });
    }
  }

  // Demandes envoyées
  const ulEnvoyees = document.getElementById("liste-demandes-envoyees");
  if (ulEnvoyees) {
    ulEnvoyees.innerHTML = "";
    if (!data.demandesEnvoyees || data.demandesEnvoyees.length === 0) {
      ulEnvoyees.innerHTML = "<li>Aucune demande envoyée.</li>";
    } else {
      data.demandesEnvoyees.forEach(pseudo => {
        ulEnvoyees.innerHTML += `<li>${pseudo}</li>`;
      });
    }
  }
}

// Envoie une demande d'ami
window.envoyerDemandeAmi = async function(pseudoAmi) {
  if (!currentUser) return;
  // On cherche le user par pseudo
  const querySnapshot = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!querySnapshot.exists()) {
    alert("Aucun utilisateur trouvé avec ce pseudo.");
    return;
  }
  const amiUid = querySnapshot.data().uid;

  // Ajoute la demande envoyée à l'utilisateur courant
  await updateDoc(doc(db, "users", currentUser.uid), {
    demandesEnvoyees: arrayUnion(pseudoAmi)
  });
  // Ajoute la demande reçue à l'autre utilisateur
  await updateDoc(doc(db, "users", amiUid), {
    demandesRecues: arrayUnion(currentUser.displayName)
  });
}

// Accepte une demande d'ami
window.accepterDemande = async function(pseudoAmi) {
  if (!currentUser) return;
  // Chercher l'uid du pseudo
  const amiRef = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!amiRef.exists()) return;
  const amiUid = amiRef.data().uid;

  // Ajoute chacun dans la liste d'amis de l'autre
  await updateDoc(doc(db, "users", currentUser.uid), {
    amis: arrayUnion(pseudoAmi),
    demandesRecues: arrayRemove(pseudoAmi)
  });
  await updateDoc(doc(db, "users", amiUid), {
    amis: arrayUnion(currentUser.displayName),
    demandesEnvoyees: arrayRemove(currentUser.displayName)
  });
}

// Refuse une demande d'ami
window.refuserDemande = async function(pseudoAmi) {
  if (!currentUser) return;
  // Chercher l'uid du pseudo
  const amiRef = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!amiRef.exists()) return;
  const amiUid = amiRef.data().uid;

  await updateDoc(doc(db, "users", currentUser.uid), {
    demandesRecues: arrayRemove(pseudoAmi)
  });
  await updateDoc(doc(db, "users", amiUid), {
    demandesEnvoyees: arrayRemove(currentUser.displayName)
  });
}

// Supprimer un ami
window.supprimerAmi = async function(pseudoAmi) {
  if (!currentUser) return;
  // Chercher l'uid du pseudo
  const amiRef = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!amiRef.exists()) return;
  const amiUid = amiRef.data().uid;

  await updateDoc(doc(db, "users", currentUser.uid), {
    amis: arrayRemove(pseudoAmi)
  });
  await updateDoc(doc(db, "users", amiUid), {
    amis: arrayRemove(currentUser.displayName)
  });
}

// Défi (à compléter selon la logique duel de ton app)
window.defierAmi = function(pseudoAmi) {
  // Redirige ou initie un duel
  window.location.href = `duel.html?ami=${pseudoAmi}`;
};

// Recherche d’ami (formulaire)
document.getElementById("btn-chercher-ami")?.addEventListener("click", () => {
  const pseudo = document.getElementById("input-pseudo-ami").value.trim();
  if (pseudo) envoyerDemandeAmi(pseudo);
});

// --- Fin amis.js ---
