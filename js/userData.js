// ----- Initialisation des données utilisateur -----

// Récupération ou création des données
let userData = JSON.parse(localStorage.getItem("vfindUserData")) || {
  pseudo: "Invité",
  points: 0,
  cadre: "polaroid_1",
  historique: [],         // [{photo, cadre, date}]
  likedPhotos: [],        // [{photo, cadre}]
  signaledPhotos: []      // [{photo, cadre}]
};

// Sauvegarder dans localStorage
function saveUserData() {
  localStorage.setItem("vfindUserData", JSON.stringify(userData));
}

// ----- Fonctions de base -----

function getPseudo() {
  return userData.pseudo;
}

function setPseudo(nom) {
  userData.pseudo = nom;
  saveUserData();
}

function getPoints() {
  return userData.points;
}

function addPoints(qty) {
  userData.points += qty;
  saveUserData();
}

function removePoints(qty) {
  userData.points = Math.max(0, userData.points - qty);
  saveUserData();
}

// ----- Cadre sélectionné -----

function getCadreSelectionne() {
  return userData.cadre;
}

function setCadreSelectionne(styleName) {
  userData.cadre = styleName;
  saveUserData();
}

// ----- Historique des photos -----

function sauvegarderPhoto(photoBase64) {
  const date = new Date().toLocaleDateString();
  const entry = {
    photo: photoBase64,
    cadre: getCadreSelectionne(),
    date: date
  };
  userData.historique.unshift(entry); // Ajout au début
  saveUserData();
}

function getHistoriquePhotos() {
  return userData.historique;
}

// ----- Photos aimées ❤️ -----

function likePhoto(photoData) {
  userData.likedPhotos.push(photoData);
  saveUserData();
}

function getLikedPhotos() {
  return userData.likedPhotos;
}

function unlikePhoto(index) {
  userData.likedPhotos.splice(index, 1);
  saveUserData();
}

// ----- Signalement de photo 🚩 -----

function signalerPhoto(photoData) {
  userData.signaledPhotos.push(photoData);
  saveUserData();
}

function getSignaledPhotos() {
  return userData.signaledPhotos;
}

// ----- Réinitialisation -----

function resetUserData() {
  localStorage.removeItem("vfindUserData");
  location.reload();
}
