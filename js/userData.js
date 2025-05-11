
/// Chargement et sauvegarde des données utilisateur
function getUserData() {
  return JSON.parse(localStorage.getItem("vfindUserData")) || {
    pseudo: "Toi",
    coins: 0,
    cadres: ["polaroid_01", "polaroid_02"], // correspond aux vrais fichiers
    cadreActif: "polaroid_01",                  // idem
    historique: [],
    likedPhotos: [],
    signaledPhotos: [],
    premium: false
  };
}

function saveUserData(data) {
  localStorage.setItem("vfindUserData", JSON.stringify(data));
}

// Pseudo
function getPseudo() {
  return getUserData().pseudo;
}
function setPseudo(pseudo) {
  const data = getUserData();
  data.pseudo = pseudo;
  saveUserData(data);
}

// Points
function getPoints() {
  return getUserData().coins;
}
function addPoints(n) {
  const data = getUserData();
  data.coins += n;
  saveUserData(data);
}
function removePoints(n) {
  const data = getUserData();
  if (data.coins >= n) {
    data.coins -= n;
    saveUserData(data);
    return true;
  }
  return false;
}

// Cadres
function getCadresPossedes() {
  return getUserData().cadres;
}
function possedeCadre(id) {
  return getUserData().cadres.includes(id);
}
function acheterCadre(id) {
  const data = getUserData();
  if (!data.cadres.includes(id)) {
    data.cadres.push(id);
    saveUserData(data);
  }
}
function getCadreSelectionne() {
  return getUserData().cadreActif || "polaroid_01";
}
function setCadreSelectionne(id) {
  const data = getUserData();
  data.cadreActif = id;
  saveUserData(data);
}

// Historique
function sauvegarderPhoto(base64, defi) {
  const data = getUserData();
  data.historique.push({ base64, defi, date: new Date().toISOString() });
  saveUserData(data);
}
function getHistoriquePhotos() {
  return getUserData().historique;
}

// Likes
function likePhoto(photoId) {
  const data = getUserData();
  if (!data.likedPhotos.includes(photoId)) {
    data.likedPhotos.push(photoId);
    saveUserData(data);
  }
}
function unlikePhoto(photoId) {
  const data = getUserData();
  data.likedPhotos = data.likedPhotos.filter(id => id !== photoId);
  saveUserData(data);
}
function getLikedPhotos() {
  return getUserData().likedPhotos;
}

// Signalements
function signalerPhoto(photoId) {
  const data = getUserData();
  if (!data.signaledPhotos.includes(photoId)) {
    data.signaledPhotos.push(photoId);
    saveUserData(data);
  }
}
function getSignaledPhotos() {
  return getUserData().signaledPhotos;
}

// Premium
function isPremium() {
  return getUserData().premium === true;
}
function setPremium(status) {
  const data = getUserData();
  data.premium = status;
  saveUserData(data);
}

// Réinitialisation
function resetUserData() {
  localStorage.removeItem("vfindUserData");
}
function updateUserData(update) {
  const data = getUserData();
  Object.assign(data, update);
  saveUserData(data);
}
