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
      const defis = data.defis.slice(0, 3); // à custom selon ton besoin
      defiList.innerHTML = "";

      defis.forEach((defi, index) => {
        const id = defi.id;
        const texte = defi.intitule;

        // Les deux clés pour les photos (dépend du mode)
        const photoA = localStorage.getItem("photo_defi_" + id) || null;
        const photoB = mode === "ami"
          ? localStorage.getItem("photo_ami_" + id) || null
          : localStorage.getItem("photo_adversaire_" + id) || null;

        const jetonValide = localStorage.getItem("defi_jeton_" + id) === "1";
        const photoJeton = "assets/img/jetonpp.webp";

        // Pour afficher "Signaler" seulement si l'adversaire a vraiment mis une photo
        const advHasPhoto = !!photoB;

        const boutonTexte = photoA ? "📸 Reprendre une photo" : "📸 Prendre une photo";
        const boutonSignaler = advHasPhoto
          ? `<button class="btn-flag" onclick="alert('Photo signalée. Merci pour ton retour.')">🚩 Signaler</button>`
          : "";

        const boutonPhoto = `<button onclick="ouvrirCameraPour(${id})">${boutonTexte}</button>`;
        const jetonHTML = (!photoA && !jetonValide)
          ? `<img src="assets/img/jeton_p.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />`
          : "";

        // Structure HTML de base SANS images ni cadres directement injectés
        const html = `
          <p style="text-align:center; font-weight:bold; font-size:1.3rem;">${texte}</p>
          <div class="defi-content split">
            <div class="joueur-col">
              <span class="col-title">Toi</span>
              <div class="defi-photo-container" data-photo-joueur="${id}"></div>
              ${boutonPhoto}
              ${jetonHTML}
            </div>
            <div class="adversaire-col">
              <span class="col-title">${adversaire}</span>
              <div class="defi-photo-container" data-photo-adversaire="${id}"></div>
              ${boutonSignaler}
            </div>
          </div>
        `;

        const li = document.createElement("li");
        li.className = "defi-item";
        li.setAttribute("data-defi-id", id);
        li.innerHTML = html;
        defiList.appendChild(li);
      });

      afficherPhotosCadresDuel(cadre, mode);
    });

  // Injecte dynamiquement les cadres + photos, seulement si présente (comme solo)
  function afficherPhotosCadresDuel(cadre, mode) {
    document.querySelectorAll(".defi-item").forEach(defiEl => {
      const id = defiEl.getAttribute("data-defi-id");
      const photoA = localStorage.getItem("photo_defi_" + id);
      const photoB = mode === "ami"
        ? localStorage.getItem("photo_ami_" + id)
        : localStorage.getItem("photo_adversaire_" + id);

      // JOUEUR (gauche)
      if (photoA) {
        const container = defiEl.querySelector(`[data-photo-joueur="${id}"]`);
        if (container) {
          container.innerHTML = `
            <div class="cadre-preview">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre" />
              <img src="${photoA}" class="photo-user" onclick="toggleFit(this)">
            </div>
          `;
        }
      }

      // ADVERSAIRE (droite)
      if (photoB) {
        const container = defiEl.querySelector(`[data-photo-adversaire="${id}"]`);
        if (container) {
          container.innerHTML = `
            <div class="cadre-preview">
              <img src="assets/cadres/${cadre}.webp" class="photo-cadre" />
              <img src="${photoB}" class="photo-user" onclick="toggleFit(this)">
            </div>
          `;
        }
      }
    });
  }

  // ============ Utilitaires ============

  function updateJetonsDisplay() {
    const jetonsSpan = document.getElementById("jetons");
    if (jetonsSpan && typeof getJetons === "function") {
      jetonsSpan.textContent = getJetons();
    }
  }

  window.toggleFit = function(img) {
    img.classList.toggle("cover");
    img.classList.toggle("contain");
  };

  // ✅ POPUP JETON (idem que solo)
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
            validerDefi(defiIndexActuel, true);
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
    const url = localStorage.getItem("photo_defi_" + id);

    // Accepte la validation SANS photo SI viaJeton === true
    if (!url && !viaJeton) return;

    li.classList.add("done");
    if (viaJeton) {
      localStorage.setItem("defi_jeton_" + id, "1");
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

});
