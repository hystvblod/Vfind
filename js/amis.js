// amis.js — gestion locale des amis et invitations duel

// =============== STOCKAGE UTILISATEUR ===============
function getUserData() {
  return JSON.parse(localStorage.getItem("vfindUserData")) || {
    pseudo: "Toi",
    amis: [],
    demandesRecues: [],
    demandesEnvoyees: []
  };
}
function saveUserData(data) {
  localStorage.setItem("vfindUserData", JSON.stringify(data));
}

// =============== AFFICHAGE LISTES ===============
function afficherListesAmis() {
  const data = getUserData();
  // Liste d'amis
  const ulAmis = document.getElementById("liste-amis");
  ulAmis.innerHTML = "";
  if (data.amis.length === 0) {
    ulAmis.innerHTML = "<li>Pas d'ami pour le moment.</li>";
  } else {
    data.amis.forEach(pseudo => {
      ulAmis.innerHTML += `<li>${pseudo} <button onclick="defierAmi('${pseudo}')">Défier</button> <button onclick="supprimerAmi('${pseudo}')">❌</button></li>`;
    });
  }
  // Demandes reçues
  const ulRecues = document.getElementById("demandes-recue");
  ulRecues.innerHTML = "";
  if (data.demandesRecues.length === 0) {
    ulRecues.innerHTML = "<li>Aucune demande reçue.</li>";
  } else {
    data.demandesRecues.forEach((pseudo, i) => {
      ulRecues.innerHTML += `<li>${pseudo} <button onclick="accepterDemande('${pseudo}',${i})">Accepter</button> <button onclick="refuserDemande('${pseudo}',${i})">Refuser</button></li>`;
    });
  }
  // Demandes envoyées
  const ulEnvoyees = document.getElementById("demandes-envoyees");
  ulEnvoyees.innerHTML = "";
  if (data.demandesEnvoyees.length === 0) {
    ulEnvoyees.innerHTML = "<li>Aucune demande envoyée.</li>";
  } else {
    data.demandesEnvoyees.forEach(pseudo => {
      ulEnvoyees.innerHTML += `<li>${pseudo}</li>`;
    });
  }
}

// =============== ACTIONS ===============
window.ajouterAmi = function() {
  const input = document.getElementById("pseudo-ami");
  const pseudo = (input.value || "").trim();
  if (!pseudo) {
    alert("Entre le pseudo de ton ami !");
    return;
  }
  let data = getUserData();
  if (data.amis.includes(pseudo) || data.demandesEnvoyees.includes(pseudo)) {
    alert("Déjà ami ou demande en attente !");
    return;
  }
  data.demandesEnvoyees.push(pseudo);
  saveUserData(data);
  input.value = "";
  afficherListesAmis();
  alert("Demande envoyée (démo locale, non vraiment envoyée à quelqu'un) !");
};

// Pour la démo locale, accepter la demande l'ajoute à la liste
window.accepterDemande = function(pseudo, index) {
  let data = getUserData();
  if (!data.amis.includes(pseudo)) data.amis.push(pseudo);
  data.demandesRecues.splice(index, 1);
  saveUserData(data);
  afficherListesAmis();
};
window.refuserDemande = function(pseudo, index) {
  let data = getUserData();
  data.demandesRecues.splice(index, 1);
  saveUserData(data);
  afficherListesAmis();
};
window.supprimerAmi = function(pseudo) {
  let data = getUserData();
  data.amis = data.amis.filter(p => p !== pseudo);
  saveUserData(data);
  afficherListesAmis();
};
window.defierAmi = function(pseudo) {
  // Pour la démo : redirige vers le duel en mode ami
  window.location.href = `game_duel.html?mode=ami&adversaire=${encodeURIComponent(pseudo)}`;
};

// À l'ouverture de la page
document.addEventListener("DOMContentLoaded", afficherListesAmis);
