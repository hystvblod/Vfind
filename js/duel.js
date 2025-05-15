document.addEventListener("DOMContentLoaded", () => {
  const challengeDisplay = document.getElementById("duel-challenge");
  const defiList = document.getElementById("duel-defi-list");
  const cadre = getCadreSelectionne() || "polaroid_01";

  updateJetonsDisplay();

  // Charger les défis
  fetch("data/defis.json")
    .then(res => res.json())
    .then(data => {
      const defis = data.defis.slice(0, 3); // 3 premiers défis
      defiList.innerHTML = "";
      defis.forEach((defi, i) => {
        const id = defi.id;
        const texte = defi.intitule;

        // Photo du joueur A (toi) → locale si dispo
        const photoA = localStorage.getItem(`photo_defi_${id}`) || "photos/photo_joueurA.jpg";
        // Photo du joueur B (adversaire) → image par défaut pour l’instant
        const photoB = "photos/photo_joueurB.jpg";

        const li = document.createElement("li");
        li.className = "defi-item";
        li.innerHTML = `
          <p style="text-align:center; font-weight:bold; font-size:1.3rem;">${texte}</p>
          <div class="defi-content">
            <div class="cadre-preview">
              <img src="${photoA}" class="photo-user cover" onclick="toggleFit(this)">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre">
            </div>
            <div class="cadre-preview">
              <img src="${photoB}" class="photo-user cover" onclick="toggleFit(this)">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre">
            </div>
          </div>
          <div class="btn-row">
            <button class="btn-flag" onclick="alert('Photo signalée. Merci pour ton retour.')">🚩 Signaler</button>
          </div>
        `;
        defiList.appendChild(li);
      });
    })
    .catch(err => {
      console.error("Erreur chargement défis duel :", err);
    });
});

function updateJetonsDisplay() {
  const jetonsSpan = document.getElementById("jetons");
  if (jetonsSpan && typeof getJetons === "function") {
    jetonsSpan.textContent = getJetons();
  }
}

function toggleFit(img) {
  img.classList.toggle("cover");
  img.classList.toggle("contain");
}
