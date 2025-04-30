
document.addEventListener("DOMContentLoaded", () => {
  const challengeDisplay = document.getElementById("duel-challenge");
  const canvasA = document.getElementById("canvas-joueurA");
  const canvasB = document.getElementById("canvas-joueurB");

  const userData = JSON.parse(localStorage.getItem("vfind_user")) || {
    pseudo: "Toi",
    cadre: "polaroid_1",
    historique: []
  };

  // Tirage d'un défi au hasard (à synchroniser en vrai serveur)
  fetch("data/defis.json")
    .then(res => res.json())
    .then(defis => {
      const defi = defis[Math.floor(Math.random() * defis.length)];
      challengeDisplay.textContent = defi;
    });

  // Simule chargement des photos (à remplacer par vraies photos ou envoi peer-to-peer)
  const demoPhoto = "logo.png";
  drawPolaroid(demoPhoto, userData.cadre, canvasA);
  drawPolaroid(demoPhoto, "polaroid_2", canvasB);

  // Gestion des signalements
  document.querySelectorAll(".report-button").forEach(button => {
    button.addEventListener("click", () => {
      alert("Photo signalée. Merci pour ton retour.");
    });
  });
});
