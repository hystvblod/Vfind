document.addEventListener("DOMContentLoaded", () => {
  const challengeDisplay = document.getElementById("duel-challenge");
  const canvasA = document.getElementById("canvas-joueurA");
  const canvasB = document.getElementById("canvas-joueurB");

  updateJetonsDisplay(); // ✅ Met à jour les jetons dès le chargement

  // Tirage d'un défi aléatoire
  fetch("data/defis.json")
    .then(res => res.json())
    .then(defis => {
      const defi = defis[Math.floor(Math.random() * defis.length)];
      challengeDisplay.textContent = defi;
    });

  // Simulation de chargement des photos
  const demoPhoto = "logo.png";
  const cadre = getCadreSelectionne(); // 📌 plus propre que userData direct
  drawPolaroid(demoPhoto, cadre, canvasA);
  drawPolaroid(demoPhoto, "polaroid_02", canvasB);

  // Gestion des signalements
  document.querySelectorAll(".report-button").forEach(button => {
    button.addEventListener("click", () => {
      alert("Photo signalée. Merci pour ton retour.");
    });
  });
});

function updateJetonsDisplay() {
  const jetonsSpan = document.getElementById("jetons");
  if (jetonsSpan && typeof getJetons === "function") {
    jetonsSpan.textContent = getJetons();
  }
}
