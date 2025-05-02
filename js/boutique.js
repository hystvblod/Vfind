// boutique.js

document.addEventListener("DOMContentLoaded", () => {
  fetch("data/cadres.json")
    .then(response => response.json())
    .then(data => afficherCadres(data))
    .catch(error => console.error("Erreur de chargement des cadres :", error));
});

function afficherCadres(cadres) {
  const listeCadres = document.getElementById("boutique-container");

  cadres.forEach(cadre => {
    const container = document.createElement("div");
    container.className = "cadre-container";

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 360;

    const nom = document.createElement("div");
    nom.className = "nom-cadre";
    nom.textContent = cadre.nom;

    const etat = document.createElement("div");
    etat.className = "etat-cadre";
    etat.textContent = cadre.etat === "débloqué" ? "✅ Débloqué" : "🔒 Verrouillé";

    container.appendChild(canvas);
    container.appendChild(nom);
    container.appendChild(etat);

    listeCadres.appendChild(container);

    // Affichage du cadre
    drawPolaroidPreview(cadre.id, canvas);
  });
}

function drawPolaroidPreview(styleName, canvasTarget) {
  const ctx = canvasTarget.getContext("2d");

  ctx.clearRect(0, 0, canvasTarget.width, canvasTarget.height);

  // Fond blanc par défaut
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height);

  // Affiche le cadre sans attendre d’image
  drawPolaroidFrame(styleName, ctx, canvasTarget.width, canvasTarget.height);
}
