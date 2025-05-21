// amis.js — gestion cloud Firestore des amis et invitations duel

// === Helpers Firebase ===
async function waitForFirebaseReady() {
  return new Promise(resolve => {
    function check() {
      if (
        window.firebaseAuth &&
        window.firebaseDB &&
        window.firebaseFirestore &&
        window.firebaseAuth.currentUser
      ) {
        resolve();
      } else setTimeout(check, 100);
    }
    check();
  });
}

async function getUserDocRef() {
  await waitForFirebaseReady();
  const user = window.firebaseAuth.currentUser;
  return window.firebaseFirestore.doc(window.firebaseDB, "users", user.uid);
}

async function getUserDataCloud() {
  await waitForFirebaseReady();
  const ref = await getUserDocRef();
  const snap = await window.firebaseFirestore.getDoc(ref);
  return snap.exists() ? snap.data() : {
    pseudo: "Toi",
    amis: [],
    demandesRecues: [],
    demandesEnvoyees: []
  };
}

async function updateUserDataCloud(update) {
  const ref = await getUserDocRef();
  await window.firebaseFirestore.updateDoc(ref, update);
}

// =============== AFFICHAGE LISTES ===============
async function afficherListesAmis() {
  const data = await getUserDataCloud();

  const ulAmis = document.getElementById("liste-amis");
  if (ulAmis) {
    ulAmis.innerHTML = "";
    if (!data.amis || data.amis.length === 0) {
      ulAmis.innerHTML = "<li>Pas d'ami pour le moment.</li>";
    } else {
      data.amis.forEach(pseudo => {
        ulAmis.innerHTML += `<li>${pseudo} <button onclick="defierAmi('${pseudo}')">Défier</button> <button onclick="supprimerAmi('${pseudo}')">❌</button></li>`;
      });
    }
  }

  const ulRecues = document.getElementById("demandes-recue");
  if (ulRecues) {
    ulRecues.innerHTML = "";
    if (!data.demandesRecues || data.demandesRecues.length === 0) {
      ulRecues.innerHTML = "<li>Aucune demande reçue.</li>";
    } else {
      data.demandesRecues.forEach((pseudo, i) => {
        ulRecues.innerHTML += `<li>${pseudo} <button onclick="accepterDemande('${pseudo}',${i})">Accepter</button> <button onclick="refuserDemande('${pseudo}',${i})">Refuser</button></li>`;
      });
    }
  }

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

// =============== ACTIONS ===============
window.ajouterAmi = async function () {
  const input = document.getElementById("pseudo-ami");
  if (!input) {
    alert("Champ introuvable !");
    return;
  }
  const pseudo = (input.value || "").trim();
  if (!pseudo) {
    alert("Entre le pseudo de ton ami !");
    return;
  }

  let data = await getUserDataCloud();
  if ((data.amis || []).includes(pseudo) || (data.demandesEnvoyees || []).includes(pseudo)) {
    alert("Déjà ami ou demande en attente !");
    return;
  }

  // Enregistre la demande dans TON profil (demandesEnvoyees)
  data.demandesEnvoyees = data.demandesEnvoyees || [];
  data.demandesEnvoyees.push(pseudo);
  await updateUserDataCloud({ demandesEnvoyees: data.demandesEnvoyees });

  // Enregistre la demande dans le profil de l’ami (demandesRecues)
  // Il faut chercher l'utilisateur correspondant au pseudo
  // ATTENTION : ici on suppose que "pseudo" est unique
  const usersColl = window.firebaseFirestore.collection(window.firebaseDB, "users");
  const q = window.firebaseFirestore.query(usersColl, window.firebaseFirestore.where("pseudo", "==", pseudo));
  const res = await window.firebaseFirestore.getDocs(q);
  if (!res.empty) {
    const amiDoc = res.docs[0];
    const amiData = amiDoc.data();
    const recues = amiData.demandesRecues || [];
    if (!recues.includes(data.pseudo)) {
      recues.push(data.pseudo);
      await window.firebaseFirestore.updateDoc(amiDoc.ref, { demandesRecues: recues });
    }
  }
  input.value = "";
  await afficherListesAmis();
  alert("Demande envoyée !");
};

window.accepterDemande = async function (pseudo, index) {
  let data = await getUserDataCloud();
  // Ajoute l’ami à la liste
  data.amis = data.amis || [];
  if (!data.amis.includes(pseudo)) data.amis.push(pseudo);

  // Retire la demande reçue
  data.demandesRecues.splice(index, 1);

  // Retire aussi la demande envoyée côté ami
  // Cherche le doc ami
  const usersColl = window.firebaseFirestore.collection(window.firebaseDB, "users");
  const q = window.firebaseFirestore.query(usersColl, window.firebaseFirestore.where("pseudo", "==", pseudo));
  const res = await window.firebaseFirestore.getDocs(q);
  if (!res.empty) {
    const amiDoc = res.docs[0];
    let amiData = amiDoc.data();
    amiData.amis = amiData.amis || [];
    if (!amiData.amis.includes(data.pseudo)) amiData.amis.push(data.pseudo);
    // Retire demande envoyée côté ami
    amiData.demandesEnvoyees = (amiData.demandesEnvoyees || []).filter(p => p !== data.pseudo);
    await window.firebaseFirestore.updateDoc(amiDoc.ref, {
      amis: amiData.amis,
      demandesEnvoyees: amiData.demandesEnvoyees
    });
  }

  await updateUserDataCloud({
    amis: data.amis,
    demandesRecues: data.demandesRecues
  });
  await afficherListesAmis();
};

window.refuserDemande = async function (pseudo, index) {
  let data = await getUserDataCloud();
  data.demandesRecues.splice(index, 1);
  await updateUserDataCloud({ demandesRecues: data.demandesRecues });
  await afficherListesAmis();
};

window.supprimerAmi = async function (pseudo) {
  let data = await getUserDataCloud();
  data.amis = (data.amis || []).filter(p => p !== pseudo);
  await updateUserDataCloud({ amis: data.amis });

  // Retire aussi côté ami
  const usersColl = window.firebaseFirestore.collection(window.firebaseDB, "users");
  const q = window.firebaseFirestore.query(usersColl, window.firebaseFirestore.where("pseudo", "==", pseudo));
  const res = await window.firebaseFirestore.getDocs(q);
  if (!res.empty) {
    const amiDoc = res.docs[0];
    let amiData = amiDoc.data();
    amiData.amis = (amiData.amis || []).filter(p => p !== data.pseudo);
    await window.firebaseFirestore.updateDoc(amiDoc.ref, { amis: amiData.amis });
  }

  await afficherListesAmis();
};

window.defierAmi = function (pseudo) {
  window.location.href = `duel_game.html?mode=ami&adversaire=${encodeURIComponent(pseudo)}`;
};

document.addEventListener("DOMContentLoaded", afficherListesAmis);
