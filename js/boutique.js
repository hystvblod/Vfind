document.addEventListener("DOMContentLoaded", () => {
  const boutiqueContainer = document.getElementById("boutique-container");
  const pointsDisplay = document.getElementById("points");
  const feedback = document.getElementById("gain-feedback");
  const popupGain = document.getElementById("popup-gain");
  let userPoints = parseInt(localStorage.getItem("vfind_points")) || 0;

  pointsDisplay.textContent = userPoints;

  // ✅ Gérer ouverture de la fenêtre
  const gainBtn = document.getElementById("gain-btn");
  if (gainBtn) {
    gainBtn.addEventListener("click", () => {
      popupGain.classList.remove("hidden");
      popupGain.classList.add("show"); // ✅ rend visible et interactive
    });
  }

  // ✅ Fermer la fenêtre
  window.closePopup = function () {
    popupGain.classList.remove("show");
    popupGain.classList.add("hidden");
  };

  // ✅ Gagner pièces via pub
  window.watchAd = function () {
    userPoints += 100;
    updatePointsDisplay();
    showFeedback("+100 💰");
    closePopup();
  };

  // ✅ Gagner pièces via invitation
  window.inviteFriend = function () {
    userPoints += 300;
    updatePointsDisplay();
    showFeedback("+300 💰");
    closePopup();
  };

  // ✅ Met à jour le compteur
  function updatePointsDisplay() {
    pointsDisplay.textContent = userPoints;
    localStorage.setItem("vfind_points", userPoints);
  }

  // ✅ Effet visuel "+100"
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

  // ✅ Chargement des cadres
  const ownedFrames = JSON.parse(localStorage.getItem("vfind_owned_frames")) || [];
  fetch("data/cadres.json")
    .then(res => res.json())
    .then(data => {
      data.forEach(cadre => {
        const item = document.createElement("div");
        item.classList.add("cadre-item");

        const wrapper = document.createElement("div");
        wrapper.classList.add("cadre-preview");

        const photo = document.createElement("img");
        photo.src = "assets/img/exemple.jpg";
        photo.className = "photo-user";

        const cadreImg = document.createElement("img");
        cadreImg.src = `assets/cadres/${cadre.id}.webp`;
        cadreImg.className = "photo-cadre";

        wrapper.appendChild(photo);
        wrapper.appendChild(cadreImg);

        const title = document.createElement("h3");
        title.textContent = cadre.nom;

        const price = document.createElement("p");
        price.textContent = `${cadre.prix} pièces`;

        const button = document.createElement("button");
        if (ownedFrames.includes(cadre.id)) {
          button.textContent = "✅ Acheté";
          button.disabled = true;
        } else {
          button.textContent = "Acheter";
          button.addEventListener("click", () => acheterCadre(cadre.id, cadre.prix));
        }

        item.appendChild(wrapper);
        item.appendChild(title);
        item.appendChild(price);
        item.appendChild(button);
        boutiqueContainer.appendChild(item);
      });
    });

  function acheterCadre(id, prix) {
    if (userPoints < prix) {
      alert("❌ Pas assez de pièces !");
      return;
    }

    userPoints -= prix;
    updatePointsDisplay();

    const owned = JSON.parse(localStorage.getItem("vfind_owned_frames")) || [];
    owned.push(id);
    localStorage.setItem("vfind_owned_frames", JSON.stringify(owned));
    location.reload();
  }
  setTimeout(() => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.style.overflowX = "hidden";
  }, 100);  
});
