// ✅ DUEL.JS FINAL (JETONPP.WEBP AFFICHÉ DANS LE CADRE SI VALIDÉ AVEC JETON)

document.addEventListener("DOMContentLoaded", () => {
  // Récupère le mode et l'adversaire depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "random";
  const adversaire = params.get("adversaire") || (mode === "random" ? "Adversaire mystère" : "Ton ami");

  const defiList = document.getElementById("duel-defi-list");
  const cadre = (typeof getCadreSelectionne === "function" ? getCadreSelectionne() : "polaroid_01");
  updateJetonsDisplay();

  // Affiche le nom de l'adversaire sur la page si tu as un endroit prévu :
  const advName = document.getElementById("nom-adversaire");
  if (advName) advName.textContent = adversaire;

  fetch("data/defis.json")
    .then(res => res.json())
    .then(data => {
      // Tu peux améliorer ici : randomise les défis, ou choisis selon ton mode
      const defis = data.defis.slice(0, 3); // à custom selon ton besoin
      defiList.innerHTML = "";

      defis.forEach((defi, index) => {
        const id = defi.id;
        const texte = defi.intitule;
        const photoA = localStorage.getItem(`photo_defi_${id}`) || null;
        const photoB = mode === "ami"
          ? localStorage.getItem(`photo_ami_${id}`) || "photos/photo_joueurB.jpg"
          : "photos/photo_joueurB.jpg";
        const jetonValide = localStorage.getItem(`defi_jeton_${id}`) === "1";
        const photoJeton = "assets/img/jetonpp.webp"; // Ton vrai fichier .webp jeton !

        const hasPhoto = !!photoA;
        const boutonTexte = hasPhoto ? "📸 Reprendre une photo" : "📸 Prendre une photo";
        const boutonPhoto = `<button onclick="ouvrirCameraPour(${id})">${boutonTexte}</button>`;

        const li = document.createElement("li");
        li.className = "defi-item";
        li.setAttribute("data-defi-id", id);

        li.innerHTML = `
          <p style="text-align:center; font-weight:bold; font-size:1.3rem;">${texte}</p>
          <div class="defi-content split">
            <div class="joueur-col">
              <span class="col-title">Toi</span>
              <div class="cadre-preview">
                <img src="${jetonValide ? photoJeton : (photoA || "photos/photo_joueurA.jpg")}"
                     class="photo-user cover${jetonValide ? ' jeton-inside' : ''}"
                     ${jetonValide ? '' : 'onclick="toggleFit(this)"'}>
                <img src="assets/cadres/${cadre}.webp" class="photo-cadre">
              </div>
            </div>
            <div class="adversaire-col">
              <span class="col-title">${adversaire}</span>
              <div class="cadre-preview">
                <img src="${photoB}" class="photo-user cover" onclick="toggleFit(this)">
                <img src="assets/cadres/${cadre}.webp" class="photo-cadre">
              </div>
            </div>
          </div>
          <div class="btn-row">
            ${boutonPhoto}
            ${(!hasPhoto && !jetonValide) ? `<img src="assets/img/jeton_p.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />` : ""}
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

// ============ Utilitaires ============

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
          validerDefi(defiIndexActuel, true); // ✅ précise la validation par jeton !
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

// ============ HISTORIQUE DUEL ============

const HISTORY_KEY = "vfindHistorique";
let defisDuelValides = [null, null, null];

// Validation d'un défi, gère aussi l'affichage du jeton dans le cadre !
window.validerDefi = function(index, viaJeton = false) {
  const defis = document.querySelectorAll("#duel-defi-list li");
  const li = defis[index];
  const id = li.getAttribute("data-defi-id");
  const url = localStorage.getItem(`photo_defi_${id}`);

  // Accepte la validation SANS photo SI viaJeton === true
  if (!url && !viaJeton) return;

  li.classList.add("done");
  if (viaJeton) {
    localStorage.setItem(`defi_jeton_${id}`, "1");
  }
  const texteDefi = li.querySelector("p").textContent.trim();
  defisDuelValides[index] = texteDefi;

  setTimeout(() => {
    alert("✅ Merci d’avoir regardé la pub !");
    if (defisDuelValides.every(Boolean)) {
      enregistrerDuelHistorique(defisDuelValides);
      defisDuelValides = [null, null, null];
    }
    // Recharge la page pour afficher le jeton dans le cadre
    window.location.reload();
  }, 2000);
};

function enregistrerDuelHistorique(defisValides) {
  const historique = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR");
  const time = now.toLocaleTimeString("fr-FR");
  const dateStr = `${date}, ${time}`;
  historique.unshift({
    date: dateStr,
    defis_duel: defisValides,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historique));
}
