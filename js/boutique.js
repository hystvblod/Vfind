document.addEventListener("DOMContentLoaded", () => {
  if (typeof drawPolaroid !== "function") {
    console.error("drawPolaroid n'est pas disponible !");
    return;
  }

  // ... ton code actuel ici ...
});

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

        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 400;

        // Appel à drawPolaroid (défini dans polaroid.js)
        drawPolaroid("assets/img/exemple.jpg", cadre.nom, canvas);

        const title = document.createElement("h3");
        title.textContent = cadre.nom;

        const price = document.createElement("p");
        price.textContent = `${cadre.prix} pièces`;

        const button = document.createElement("button");

        if (ownedFrames.includes(cadre.nom)) {
          button.textContent = "✅ Acheté";
          button.disabled = true;
        } else {
          button.textContent = "Acheter";
          button.addEventListener("click", () => acheterCadre(cadre.nom, cadre.prix));
        }

        item.appendChild(canvas);
        item.appendChild(title);
        item.appendChild(price);
        item.appendChild(button);

        boutiqueContainer.appendChild(item);
      });
    });

  function acheterCadre(nom, prix) {
    if (userPoints < prix) {
      alert("❌ Pas assez de pièces !");
      return;
    }

    userPoints -= prix;
    pointsDisplay.textContent = userPoints;
    localStorage.setItem("vfind_points", userPoints.toString());

    const owned = JSON.parse(localStorage.getItem("vfind_owned_frames")) || [];
    owned.push(nom);
    localStorage.setItem("vfind_owned_frames", JSON.stringify(owned));

    location.reload();
  }
});
