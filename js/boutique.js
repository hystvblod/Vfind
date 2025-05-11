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
  function afficherCadresDans(containerId = "cadres-list") {
    const cadreActif = localStorage.getItem("cadre_selectionne") || "polaroid_01";
    const ownedFrames = JSON.parse(localStorage.getItem("vfind_owned_frames")) || [];
  
    fetch("data/cadres.json")
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
  
        data.forEach(cadre => {
          if (!ownedFrames.includes(cadre.id)) return;
  
          const item = document.createElement("div");
          item.classList.add("cadre-item");
  
          const preview = document.createElement("div");
          preview.className = "cadre-preview";
  
          const photo = document.createElement("img");
          photo.src = "assets/img/exemple.jpg";
          photo.className = "photo-user profil";
  
          const cadreImg = document.createElement("img");
          cadreImg.src = `assets/cadres/${cadre.id}.webp`;
          cadreImg.className = "photo-cadre";
  
          preview.appendChild(photo);
          preview.appendChild(cadreImg);
  
          const title = document.createElement("h3");
          title.textContent = cadre.nom;
  
          const button = document.createElement("button");
          button.textContent = cadre.id === cadreActif ? "✅ Utilisé" : "Utiliser";
          if (cadre.id === cadreActif) button.disabled = true;
  
          button.onclick = () => {
            localStorage.setItem("cadre_selectionne", cadre.id);
            alert("✅ Cadre sélectionné !");
            location.reload();
          };
  
          item.appendChild(preview);
          item.appendChild(title);
          item.appendChild(button);
          container.appendChild(item);
        });
      });
  }  

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
  
  // ✅ Fermer la popup si on clique sur le fond
document.addEventListener("click", function (e) {
  const popup = document.getElementById("popup-gain");
  if (popup.classList.contains("show") && e.target === popup) {
    closePopup();
  }
});

});
