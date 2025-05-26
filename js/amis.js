// === amis.js (version PRO tout Firebase, pseudoPublic) ===
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();
let currentUser = null;
let myPseudo = null;

// Récupère l'utilisateur connecté
auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    // Récupère pseudoPublic
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) myPseudo = snap.data().pseudoPublic || currentUser.uid;
    listenUserData();
    detecterInvitationParLien();
  } else {
    window.location.href = "login.html";
  }
});

// Écoute en temps réel les listes (amis/demandes)
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
  const ulRecues = document.getElementById("demandes-recue") || document.getElementById("liste-demandes-recues");
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
  const ulEnvoyees = document.getElementById("demandes-envoyees");
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

// --- GESTION DES AMIS ---

// Envoie une demande d'ami par pseudoPublic
window.envoyerDemandeAmi = async function(pseudoAmi) {
  if (!currentUser || !pseudoAmi) return;
  if (pseudoAmi === myPseudo) {
    alert("Tu ne peux pas t'ajouter toi-même !");
    return;
  }
  // Cherche le user par pseudoPublic dans users_by_pseudo
  const userByPseudoRef = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!userByPseudoRef.exists()) {
    alert("Aucun utilisateur trouvé avec ce pseudo.");
    return;
  }
  const amiUid = userByPseudoRef.data().uid;

  // Vérifie que tu n'as pas déjà envoyé/reçu la demande ou que vous n'êtes pas déjà amis
  const selfRef = doc(db, "users", currentUser.uid);
  const selfSnap = await getDoc(selfRef);
  const selfData = selfSnap.data() || {};
  if ((selfData.amis||[]).includes(pseudoAmi)) {
    alert("Vous êtes déjà amis !");
    return;
  }
  if ((selfData.demandesEnvoyees||[]).includes(pseudoAmi)) {
    alert("Demande déjà envoyée.");
    return;
  }
  if ((selfData.demandesRecues||[]).includes(pseudoAmi)) {
    alert("Cette personne t'a déjà envoyé une demande !");
    return;
  }

  // Ajoute la demande envoyée à toi-même
  await updateDoc(doc(db, "users", currentUser.uid), {
    demandesEnvoyees: arrayUnion(pseudoAmi)
  });
  // Ajoute la demande reçue à l'autre
  await updateDoc(doc(db, "users", amiUid), {
    demandesRecues: arrayUnion(myPseudo)
  });

  alert("Demande envoyée à " + pseudoAmi + " !");
};

// Accepter une demande d'ami
window.accepterDemande = async function(pseudoAmi) {
  if (!currentUser || !pseudoAmi) return;
  const amiRef = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!amiRef.exists()) return;
  const amiUid = amiRef.data().uid;

  // Ajoute chacun dans la liste d'amis de l'autre
  await updateDoc(doc(db, "users", currentUser.uid), {
    amis: arrayUnion(pseudoAmi),
    demandesRecues: arrayRemove(pseudoAmi)
  });
  await updateDoc(doc(db, "users", amiUid), {
    amis: arrayUnion(myPseudo),
    demandesEnvoyees: arrayRemove(myPseudo)
  });
  alert("Vous êtes maintenant amis !");
};

// Refuser une demande d'ami
window.refuserDemande = async function(pseudoAmi) {
  if (!currentUser || !pseudoAmi) return;
  const amiRef = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!amiRef.exists()) return;
  const amiUid = amiRef.data().uid;

  await updateDoc(doc(db, "users", currentUser.uid), {
    demandesRecues: arrayRemove(pseudoAmi)
  });
  await updateDoc(doc(db, "users", amiUid), {
    demandesEnvoyees: arrayRemove(myPseudo)
  });
  alert("Demande refusée !");
};

// Supprimer un ami
window.supprimerAmi = async function(pseudoAmi) {
  if (!currentUser || !pseudoAmi) return;
  const amiRef = await getDoc(doc(db, "users_by_pseudo", pseudoAmi));
  if (!amiRef.exists()) return;
  const amiUid = amiRef.data().uid;

  await updateDoc(doc(db, "users", currentUser.uid), {
    amis: arrayRemove(pseudoAmi)
  });
  await updateDoc(doc(db, "users", amiUid), {
    amis: arrayRemove(myPseudo)
  });
  alert("Ami supprimé.");
};

// Défi (à compléter selon la logique duel de ton app)
window.defierAmi = function(pseudoAmi) {
  // Redirige ou initie un duel
  window.location.href = `duel.html?ami=${pseudoAmi}`;
};

// Recherche d’ami (formulaire, bouton)
document.getElementById("btn-ajouter-ami")?.addEventListener("click", () => {
  const pseudo = document.getElementById("pseudo-ami").value.trim();
  if (pseudo) envoyerDemandeAmi(pseudo);
});

// --- GESTION DU LIEN D’INVITATION ---
document.getElementById("btn-lien-invit")?.addEventListener("click", async () => {
  if (!currentUser) return alert("Non connecté !");
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const pseudo = snap.data().pseudoPublic;
    const base = window.location.origin + window.location.pathname;
    document.getElementById("lien-invit-output").value = `${base}?add=${pseudo}`;
  }
});

// --- Détection ajout ami via lien d’invitation ?add=... ---
function detecterInvitationParLien() {
  const params = new URLSearchParams(window.location.search);
  const toAdd = params.get("add");
  if (toAdd) {
    // Préremplit et auto-propose l’envoi
    document.getElementById("pseudo-ami").value = toAdd;
    if (confirm(`Ajouter ${toAdd} comme ami ?`)) {
      envoyerDemandeAmi(toAdd);
      // Nettoie l’URL après
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}
