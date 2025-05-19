document.addEventListener("DOMContentLoaded", () => {
  const boutiqueContainer = document.getElementById("boutique-container");
  const pointsDisplay = document.getElementById("points");
  const feedback = document.getElementById("gain-feedback");
  const popupGain = document.getElementById("popup-gain");

  let userPoints = getPoints();
  updatePointsDisplay();
  updateJetonsDisplay();

  const gainBtn = document.getElementById("gain-btn");
  if (gainBtn) {
    gainBtn.addEventListener("click", () => {
      const popupJeton = document.getElementById("popup-achat-jeton");
      if (popupJeton.classList.contains("show")) {
        popupJeton.classList.remove("show");
        popupJeton.classList.add("hidden");
      }
      popupGain.classList.remove("hidden");
      popupGain.classList.add("show");
    });
  }

  window.closePopup = function () {
    popupGain.classList.remove("show");
    popupGain.classList.add("hidden");
  };

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

  function updatePointsDisplay() {
    if (pointsDisplay) {
      pointsDisplay.textContent = getPoints();
    }
  }

  function updateJetonsDisplay() {
    const jetonsSpan = document.getElementById("jetons");
    if (jetonsSpan && typeof getJetons === "function") {
      jetonsSpan.textContent = getJetons();
    }
  }

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

  function ouvrirPopupJetonBoutique() {
    document.getElementById("popup-achat-jeton").classList.remove("hidden");
    document.getElementById("popup-achat-jeton").classList.add("show");
  }

  function fermerPopupJetonBoutique() {
    document.getElementById("popup-achat-jeton").classList.remove("show");
    document.getElementById("popup-achat-jeton").classList.add("hidden");
  }

  function acheterJetonsAvecPieces() {
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

  function acheterJetonsAvecPub() {
    alert("📺 Simulation de pub regardée !");
    setTimeout(() => {
      addJetons(3);
      alert("✅ 3 jetons ajoutés !");
      updateJetonsDisplay();
      fermerPopupJetonBoutique();
    }, 3000);
  }

  const ownedFrames = getUserData().cadres;
  fetch("data/cadres.json")
    .then(res => res.json())
    .then(data => {
      const boutiqueContainer = document.getElementById("boutique-container");
      boutiqueContainer.innerHTML = "";

      // Fonction pour catégoriser selon le numéro de polaroid
      function getCategorie(id) {
        const num = parseInt(id.replace('polaroid_', ''));
        if (num >= 1 && num <= 10) return 'classique';
        if (num >= 11 && num <= 100) return 'deluxe';
        if (num >= 101 && num <= 200) return 'premium';
        if (num >= 900 && num <= 1000) return 'bloque';
        return 'autre';
      }

      // Définir les catégories et leur ordre
      const categories = [
        { key: 'classique', nom: 'Classique 🎞️' },
        { key: 'deluxe', nom: 'Deluxe 🌈' },
        { key: 'premium', nom: 'Premium 👑' },
        { key: 'bloque', nom: 'Cadres défi / spéciaux 🔒' }
      ];

      categories.forEach(cat => {
        // Filtrer les cadres de cette catégorie
        const cadresCat = data.filter(cadre => getCategorie(cadre.id) === cat.key);
        if (!cadresCat.length) return;

        // Ajouter un titre de catégorie
        const titre = document.createElement("h3");
        titre.textContent = cat.nom;
        boutiqueContainer.appendChild(titre);

        // Créer une grid pour cette catégorie
        const grid = document.createElement("div");
        grid.className = "grid-cadres";

        cadresCat.forEach(cadre => {
          const item = document.createElement("div");
          item.classList.add("cadre-item");

          // -- Affichage miniature --
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

if (getCategorie(cadre.id) === "bloque") {
  button.textContent = "Réservé";
  button.disabled = true;
  button.classList.add("disabled-premium");
} else if (getCategorie(cadre.id) === "premium" && !isPremiumUser()) {
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

        boutiqueContainer.appendChild(grid);
      });
    });

  window.ouvrirPopupJetonBoutique = ouvrirPopupJetonBoutique;
  window.fermerPopupJetonBoutique = fermerPopupJetonBoutique;
  window.acheterJetonsAvecPieces = acheterJetonsAvecPieces;
  window.acheterJetonsAvecPub = acheterJetonsAvecPub;

  setTimeout(() => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.style.overflowX = "hidden";
  }, 100);

  document.addEventListener("click", function (e) {
    if (popupGain.classList.contains("show") && e.target === popupGain) {
      closePopup();
    }
  });
}); // <== Cette parenthèse et ce point-virgule FERMER TOUT
