// ✅ DUEL.JS FINAL

document.addEventListener("DOMContentLoaded", () => {
  const defiList = document.getElementById("duel-defi-list");
  const cadre = getCadreSelectionne(); // pas de fallback ici, comme dans solo
  updateJetonsDisplay();

  fetch("data/defis.json")
    .then(res => res.json())
    .then(data => {
      const defis = data.defis.slice(0, 3);
      defiList.innerHTML = "";

      defis.forEach((defi, index) => {
        const id = defi.id;
        const texte = defi.intitule;
        const photoA = localStorage.getItem(`photo_defi_${id}`) || null;
        const photoB = "photos/photo_joueurB.jpg";

        const li = document.createElement("li");
        li.className = "defi-item";
        li.setAttribute("data-defi-id", id);

        const hasPhoto = !!photoA;
        const boutonTexte = hasPhoto ? "📸 Reprendre une photo" : "📸 Prendre une photo";
        const boutonPhoto = `<button onclick="ouvrirCameraPour(${id})">${boutonTexte}</button>`;

        li.innerHTML = `
          <p style="text-align:center; font-weight:bold; font-size:1.3rem;">${texte}</p>
          <div class="defi-content">
            <div class="cadre-preview">
              <img src="${photoA || "photos/photo_joueurA.jpg"}" class="photo-user cover" onclick="toggleFit(this)">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre">
            </div>
            <div class="cadre-preview">
              <img src="${photoB}" class="photo-user cover" onclick="toggleFit(this)">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre">
            </div>
          </div>
          <div class="btn-row">
            ${boutonPhoto}
            ${!hasPhoto ? `<img src="assets/img/jeton_p.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />` : ""}
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

// ✅ POPUP JETON
let defiIndexActuel = null;

window.ouvrirPopupJeton = function (index) {
  const jetons = getJetons();
  document.getElementById("solde-jeton").textContent = `Jetons disponibles : ${jetons}`;
  document.getElementById("popup-jeton").classList.remove("hidden");
  document.getElementById("popup-jeton").classList.add("show");
  defiIndexActuel = index;

  document.getElementById("valider-jeton-btn").onclick = () => {
    const jetons = getJetons();
    if (jetons > 0) {
      const success = removeJeton();
      if (success) {
        updateJetonsDisplay();
        if (typeof validerDefi === "function") {
          validerDefi(defiIndexActuel);
        }
        fermerPopupJeton();
      } else {
        alert("❌ Erreur lors du retrait du jeton.");
      }
    } else {
      alert("❌ Pas de jeton disponible. Rendez-vous dans la boutique !");
    }
  };
};

window.fermerPopupJeton = function () {
  document.getElementById("popup-jeton").classList.remove("show");
  document.getElementById("popup-jeton").classList.add("hidden");
};

// ✅ VALIDER UN DÉFI APRÈS PUB
window.validerDefi = function(index) {
  const defis = document.querySelectorAll("#duel-defi-list li");
  const li = defis[index];
  const id = li.getAttribute("data-defi-id");
  const url = localStorage.getItem(`photo_defi_${id}`);
  if (!url) return;

  li.classList.add("done");

  setTimeout(() => {
    alert("✅ Merci d’avoir regardé la pub !");
  }, 2000);
};
