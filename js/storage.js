
// Initialisation des points si inexistant
if (!localStorage.getItem("vfind_points")) {
  localStorage.setItem("vfind_points", "0");
}

// Initialisation des cadres offerts
if (!localStorage.getItem("vfind_owned_frames")) {
  localStorage.setItem("vfind_owned_frames", JSON.stringify([
    "polaroid_01",
    "polaroid_02"
  ]));
}
function resetLocalStorage() {
  localStorage.removeItem("vfindUserData");
}

// Initialisation des données si elles n'existent pas
function initUserDataIfMissing() {
  if (!localStorage.getItem("vfindUserData")) {
    const data = {
      pseudo: "Toi",
      coins: 0,
      cadres: ["polaroid_01"],
      cadreActif: "polaroid_01",
      historique: [],
      likedPhotos: [],
      signaledPhotos: [],
      premium: false
    };
    localStorage.setItem("vfindUserData", JSON.stringify(data));
  }
}
