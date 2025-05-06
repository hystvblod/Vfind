document.addEventListener("DOMContentLoaded", () => {
  const boutiqueContainer = document.getElementById("boutique-container");
  const pointsDisplay = document.getElementById("points");

  let userPoints = parseInt(localStorage.getItem("vfind_points")) || 0;
  pointsDisplay.textContent = userPoints;

  const ownedFrames = JSON.parse(localStorage.getItem("vfind_owned_frames")) || [];

  fetch("data/cadres.json")
    .then(res => res.json())
    .then(data => {
      data.forEach(cadre => {
        const item = document.createElement("div");
        item.classList.add("cadre-item");

        // ✅ Nouveau système photo + cadre WebP
        const wrapper = document.createElement("div");
        wrapper.classList.add("cadre-preview");

        const photo = document.createElement("img");
        photo.src = "assets/img/exemple.jpg"; // Remplace par la vraie photo si besoin
        photo.className = "photo-user";

        const cadreImg = document.createElement("img");
        cadreImg.src = `assets/cadres/${cadre.id}.webp`;
        cadreImg.className = "photo-cadre";

        wrapper.appendChild(cadreImg); // ✅ cadre D'ABORD
        wrapper.appendChild(photo);    // ✅ photo APRES

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
      pointsDisplay.textContent = userPoints;
      localStorage.setItem("vfind_points", userPoints.toString());

      const owned = JSON.parse(localStorage.getItem("vfind_owned_frames")) || [];
      owned.push(id);
      localStorage.setItem("vfind_owned_frames", JSON.stringify(owned));

      location.reload(); // Recharge la page pour mettre à jour le bouton
    }
    document.getElementById("gain-btn").addEventListener("click", function () {
      document.getElementById("popup-gain").classList.remove("hidden");
    });
    
    function closePopup() {
      document.getElementById("popup-gain").classList.add("hidden");
    }
    
    function watchAd() {
      alert("🎬 Pub simulée ! +100 pièces ajoutées.");
      userPoints += 100;
      pointsDisplay.textContent = userPoints;
      localStorage.setItem("vfind_points", userPoints.toString());
      closePopup();
    }
    
    function inviteFriend() {
      alert("👥 Lien d’invitation simulé ! +100 pièces à la validation.");
      userPoints += 100;
      pointsDisplay.textContent = userPoints;
      localStorage.setItem("vfind_points", userPoints.toString());
      closePopup();
    }
    
});
