
// Nettoyer totalement les données utilisateur (si besoin)
function resetLocalStorage() {
  localStorage.removeItem("vfindUserData");
}

// Initialisation des données si elles n'existent pas
function initUserDataIfMissing() {
  if (!localStorage.getItem("vfindUserData")) {
    const data = {
      pseudo: "Toi",
      coins: 0,
      cadres: ["polaroid_1"],
      cadreActif: "polaroid_1",
      historique: [],
      likedPhotos: [],
      signaledPhotos: [],
      premium: false
    };
    localStorage.setItem("vfindUserData", JSON.stringify(data));
  }
}
