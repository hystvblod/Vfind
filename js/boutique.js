document.addEventListener("DOMContentLoaded", () => {
  // Sélecteurs DOM principaux
  const boutiqueContainer = document.getElementById("boutique-container");
  const catBarContainer = document.getElementById("boutique-categories");
  const pointsDisplay = document.getElementById("points");
  const feedback = document.getElementById("gain-feedback");
  const popupGain = document.getElementById("popup-gain");

  // --- Points et jetons ---
  updatePointsDisplay();
  updateJetonsDisplay();

  function updatePointsDisplay() {
    if (pointsDisplay) pointsDisplay.textContent = getPoints();
  }

  function updateJetonsDisplay() {
    const jetonsSpan = document.getElementById("jetons");
    if (jetonsSpan && typeof getJetons === "function") {
      jetonsSpan.textContent = getJetons();
    }
  }

  // --- Feedback popups ---
  function showFeedback(text) {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.classList.remove("hidden");
    feedback.classList.add("show");
    setTimeout(() => {
      feedback.classList.remove("show");
      feedback.classList.add("hidden");
    }, 1500);
  }

  function acheterCadre(id) {
    const data = getUserData();
    if (!data.cadres.includes(id)) {
      data.cadres.push(id);
      saveUserData(data);
    }
  }

  function acheterCadreBoutique(id, prix) {
    if (getPoints() < prix) {
      alert("❌ Pas assez de pièces !");
      return;
    }
    removePoints(prix);
    updatePointsDisplay();
    acheterCadre(id);
    localStorage.setItem("vfind_selected_frame", id);
    location.reload();
  }

  // --- Popups et pub ---
  const gainBtn = document.getElementById("gain-btn");
  if (gainBtn) {
    gainBtn.addEventListener("click", () => {
      const popupJeton = document.getElementById("popup-achat-jeton");
      if (popupJeton && popupJeton.classList.contains("show")) {
        popupJeton.classList.remove("show");
        popupJeton.classList.add("hidden");
      }
      if (popupGain) {
        popupGain.classList.remove("hidden");
        popupGain.classList.add("show");
      }
    });
  }

  window.closePopup = function () {
    if (popupGain) {
      popupGain.classList.remove("show");
      popupGain.classList.add("hidden");
    }
    const oldUnlock = document.getElementById("popup-unlock-info");
    if (oldUnlock) document.body.removeChild(oldUnlock);
  };

  // ---- Popup Unlock Infos ----
  function showUnlockPopup(nom, message) {
    // Supprime une éventuelle popup précédente
    const oldPopup = document.getElementById("popup-unlock-info");
    if (oldPopup) document.body.removeChild(oldPopup);

    const popup = document.createElement("div");
    popup.id = "popup-unlock-info";
    popup.className = "popup show";
    popup.innerHTML = `
      <div class="popup-inner">
        <button id="close-popup" onclick="document.body.removeChild(this.parentNode.parentNode)">✖</button>
        <h2 style="font-size:1.4em;">${nom}</h2>
        <div style="margin:1em 0 0.5em 0;font-size:1.1em;text-align:center;">${message || "Aucune information."}</div>
      </div>
    `;
    document.body.appendChild(popup);
  }

  window.watchAd = function () {
    addPoints(100);
    updatePointsDisplay();
    showFeedback("+100 💰");
    closePopup();
  };

  window.inviteFriend = function () {
    addPoints(300);
    updatePointsDisplay();
    showFeedback("+300 💰");
    closePopup();
  };

  window.ouvrirPopupJetonBoutique = function () {
    const popup = document.getElementById("popup-achat-jeton");
    if (popup) {
      popup.classList.remove("hidden");
      popup.classList.add("show");
    }
  }

  window.fermerPopupJetonBoutique = function () {
    const popup = document.getElementById("popup-achat-jeton");
    if (popup) {
      popup.classList.remove("show");
      popup.classList.add("hidden");
    }
  }

  window.acheterJetonsAvecPieces = function () {
    if (removePoints(100)) {
      addJetons(3);
      alert("✅ 3 jetons ajoutés !");
      updatePointsDisplay();
      updateJetonsDisplay();
      fermerPopupJetonBoutique();
    } else {
      alert("❌ Pas assez de pièces.");
    }
  }

  window.acheterJetonsAvecPub = function () {
    alert("📺 Simulation de pub regardée !");
    setTimeout(() => {
      addJetons(3);
      alert("✅ 3 jetons ajoutés !");
      updateJetonsDisplay();
      fermerPopupJetonBoutique();
    }, 3000);
  }

  setTimeout(() => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.style.overflowX = "hidden";
  }, 100);

  document.addEventListener("click", function (e) {
    if (popupGain && popupGain.classList.contains("show") && e.target === popupGain) {
      closePopup();
    }
  });

  // ----- Gestion catégories -----
  const CATEGORIES = [
    { key: 'classique', nom: 'Classique' },
    { key: 'deluxe', nom: 'Deluxe' },
    { key: 'premium', nom: 'Premium' },
    { key: 'bloque', nom: 'Défi / Spéciaux 🔒' }
  ];

  function getCategorie(id) {
    const num = parseInt(id.replace('polaroid_', ''));
    if (num >= 1 && num <= 10) return 'classique';
    if (num >= 11 && num <= 100) return 'deluxe';
    if (num >= 101 && num <= 200) return 'premium';
    if (num >= 900 && num <= 1000) return 'bloque';
    return 'autre';
  }

  // --- Vérification stricte 10 jours complets dans le même mode ---
  function hasCompleted10FullDaysStrict() {
    // Historique solo et duel
    const historiqueSolo = (JSON.parse(localStorage.getItem('vfindUserData')) || {}).historique || [];
    const historiqueDuel = JSON.parse(localStorage.getItem('vfindHistorique')) || [];

    // { dateISO: { solo: n, duel: n } }
    const joursModes = {};

    // SOLO
    historiqueSolo.forEach(e => {
      const d = e.date?.slice(0,10);
      if (!d) return;
      if (!joursModes[d]) joursModes[d] = { solo: 0, duel: 0 };
      // Pour chaque défi validé ce jour-là en solo
      joursModes[d].solo += e.defi ? (Array.isArray(e.defi) ? e.defi.length : 1) : 0;
    });

    // DUEL
    historiqueDuel.forEach(e => {
      // Date format JJ/MM/YYYY, HH:MM:SS → AAAA-MM-JJ
      const parts = e.date.split(',')[0].split('/');
      if (parts.length === 3) {
        const d = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        if (!joursModes[d]) joursModes[d] = { solo: 0, duel: 0 };
        joursModes[d].duel += e.defis_duel ? e.defis_duel.length : 0;
      }
    });

    // Compte les jours où SOLO **ou** DUEL a 3 défis (pas la somme !)
    let joursComplet = 0;
    Object.values(joursModes).forEach(obj => {
      if (obj.solo >= 3 || obj.duel >= 3) joursComplet++;
    });

    return joursComplet >= 10;
  }

  let CADRES_DATA = [];
  let currentCategory = 'classique'; // Par défaut

  function renderBoutique(categoryKey) {
    // Barre des catégories
    catBarContainer.innerHTML = "";
    const bar = document.createElement("div");
    bar.className = "categories-bar";
    CATEGORIES.forEach(cat => {
      const btn = document.createElement("button");
      btn.textContent = cat.nom;
      btn.className = "btn-categorie" + (cat.key === categoryKey ? " active" : "");
      btn.onclick = () => {
        currentCategory = cat.key;
        renderBoutique(cat.key);
      };
      bar.appendChild(btn);
    });
    catBarContainer.appendChild(bar);

    // Vider entièrement le container avant de créer la nouvelle grid (sinon bug !)
    boutiqueContainer.innerHTML = "";

    // Créer la nouvelle grid SEULEMENT
    const grid = document.createElement("div");
    grid.className = "grid-cadres";

    // Affiche les cadres de la catégorie sélectionnée
    const cadresCat = CADRES_DATA.filter(cadre => getCategorie(cadre.id) === categoryKey);
    if (!cadresCat.length) {
      const empty = document.createElement("p");
      empty.textContent = "Aucun cadre dans cette catégorie.";
      grid.appendChild(empty);
    } else {
      const ownedFrames = getUserData().cadres;
      cadresCat.forEach(cadre => {
        const item = document.createElement("div");
        item.classList.add("cadre-item");

        const wrapper = document.createElement("div");
        wrapper.classList.add("cadre-preview");
        wrapper.style.width = "80px";
        wrapper.style.height = "100px";
        wrapper.style.position = "relative";
        wrapper.style.margin = "0 auto 10px";

        const cadreImg = document.createElement("img");
        cadreImg.src = `assets/cadres/${cadre.id}.webp`;
        cadreImg.className = "photo-cadre";

        const photo = document.createElement("img");
        photo.src = "assets/img/exemple.jpg";
        photo.className = "photo-user";

        wrapper.appendChild(cadreImg);
        wrapper.appendChild(photo);

        wrapper.addEventListener("click", () => {
          const popup = document.createElement("div");
          popup.className = "popup show";
          popup.innerHTML = `
            <div class="popup-inner">
              <button id="close-popup" onclick="document.body.removeChild(this.parentNode.parentNode)">✖</button>
              <div class="cadre-preview cadre-popup">
                <img class="photo-cadre" src="assets/cadres/${cadre.id}.webp" />
                <img class="photo-user" src="assets/img/exemple.jpg" />
              </div>
            </div>
          `;
          document.body.appendChild(popup);
        });

        const title = document.createElement("h3");
        title.textContent = cadre.nom;

        const price = document.createElement("p");
        price.textContent = `${cadre.prix} pièces`;

        const button = document.createElement("button");

        // Gestion spéciale du déblocage 10 jours de défis pour polaroid_901
        if (categoryKey === "bloque") {
          if (cadre.id === "polaroid_901") {
            if (hasCompleted10FullDaysStrict()) {
              if (!ownedFrames.includes(cadre.id)) {
                acheterCadre(cadre.id);
                ownedFrames.push(cadre.id);
              }
              button.textContent = "Débloqué !";
              button.disabled = true;
              button.classList.add("btn-success");
            } else {
              button.textContent = "Infos";
              button.disabled = false;
              button.classList.add("btn-info");
              button.onclick = () => {
                showUnlockPopup(cadre.nom, cadre.unlock);
              };
            }
          } else {
            button.textContent = "Infos";
            button.disabled = false;
            button.classList.add("btn-info");
            button.onclick = () => {
              showUnlockPopup(cadre.nom, cadre.unlock);
            };
          }
        } else if (categoryKey === "premium" && !isPremium()) {
          button.textContent = "Premium requis";
          button.disabled = true;
          button.classList.add("disabled-premium");
          button.title = "Ce cadre nécessite un compte premium";
        } else if (ownedFrames.includes(cadre.id)) {
          button.textContent = "Acheté";
          button.disabled = true;
        } else {
          button.textContent = "Acheter";
          button.addEventListener("click", () => acheterCadreBoutique(cadre.id, cadre.prix));
        }

        item.appendChild(wrapper);
        item.appendChild(title);
        item.appendChild(price);
        item.appendChild(button);
        grid.appendChild(item);
      });
    }
    // Ajoute la NOUVELLE grid dans le container vidé
    boutiqueContainer.appendChild(grid);
  }

  // Chargement des cadres
  fetch("data/cadres.json")
    .then(res => res.json())
    .then(data => {
      CADRES_DATA = data;
      renderBoutique(currentCategory);
    });
});
