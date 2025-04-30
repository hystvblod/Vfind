
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("boutique-container");
  const userData = JSON.parse(localStorage.getItem("vfind_user")) || {
    coins: 100,
    cadres: ["polaroid_1"]
  };

  fetch("data/cadres.json")
    .then(res => res.json())
    .then(cadres => {
      cadres.forEach(cadre => {
        const div = document.createElement("div");
        div.className = "cadre-item";
        div.innerHTML = `
          <canvas width="100" height="120" id="canvas-${cadre.id}"></canvas>
          <p>${cadre.nom}</p>
          <button ${userData.cadres.includes(cadre.id) ? "disabled" : ""} data-id="${cadre.id}">
            ${userData.cadres.includes(cadre.id) ? "Déjà acheté" : "Acheter (10 coins)"}
          </button>
        `;
        container.appendChild(div);

        const canvas = document.getElementById("canvas-" + cadre.id);
        drawPolaroid("logo.png", cadre.id, canvas); // Utilise une image par défaut
      });

      container.addEventListener("click", e => {
        if (e.target.tagName === "BUTTON") {
          const cadreId = e.target.dataset.id;
          if (userData.coins >= 10 && !userData.cadres.includes(cadreId)) {
            userData.coins -= 10;
            userData.cadres.push(cadreId);
            localStorage.setItem("vfind_user", JSON.stringify(userData));
            alert("Cadre acheté !");
            e.target.disabled = true;
            e.target.textContent = "Déjà acheté";
          } else {
            alert("Pas assez de coins ou déjà possédé.");
          }
        }
      });
    });
});
