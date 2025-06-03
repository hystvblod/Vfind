import {
  getCadresPossedes,
  getCadreSelectionne,
  setCadreSelectionne
} from './js/userData.js';

// Renvoie l’URL du cadre : base64 local si dispo, sinon lien Supabase
function getCadreUrl(id) {
  return localStorage.getItem(`cadre_${id}`) ||
    `https://swmdepiukfginzhbeccz.supabase.co/storage/v1/object/public/cadres/${id}.webp`;
}

// Zoom sur le cadre (popup)
function zoomCadre(id) {
  const popup = document.createElement("div");
  popup.className = "popup show";
  popup.innerHTML = `
    <div class="popup-inner">
      <button id="close-popup" onclick="document.body.removeChild(this.parentNode.parentNode)">✖</button>
      <div class="cadre-preview cadre-popup">
        <img class="photo-cadre" src="${getCadreUrl(id)}" />
        <img class="photo-user" src="./assets/img/exemple.jpg" />
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

// Sélectionner un cadre
async function utiliserCadre(id) {
  await setCadreSelectionne(id);
  alert("✅ Cadre sélectionné !");
  await afficherCadres();
}

// Affiche tous les cadres possédés
async function afficherCadres() {
  const container = document.getElementById("cadres-list");
  const cadresPossedes = await getCadresPossedes();
  const cadreActif = await getCadreSelectionne();

  container.innerHTML = "";

  if (!cadresPossedes.length) {
    container.innerHTML = "<p>Aucun cadre débloqué !</p>";
    return;
  }

  cadresPossedes.forEach(cadre => {
    const div = document.createElement("div");
    div.className = "cadre-item";
    div.innerHTML = `
      <div class="cadre-preview" style="cursor:zoom-in" onclick="window.zoomCadre('${cadre}')">
        <img class="photo-cadre" src="${getCadreUrl(cadre)}" />
        <img class="photo-user" src="./assets/img/exemple.jpg" />
      </div>
      <button onclick="window.utiliserCadre('${cadre}')" ${cadre === cadreActif ? "disabled" : ""}>
        ${cadre === cadreActif ? "Utilisé" : "Utiliser"}
      </button>
    `;
    container.appendChild(div);
  });
}

// Initialisation et synchro juste après un achat
document.addEventListener("DOMContentLoaded", async () => {
  window.zoomCadre = zoomCadre;
  window.utiliserCadre = utiliserCadre;

  // Patch : si la dernière update date de moins de 5 secondes,
  // force la resynchro cloud une fois (juste après un achat)
  const lastUpdate = parseInt(localStorage.getItem('lastCadresUpdate') || "0");
  if (Date.now() - lastUpdate < 5000) {
    await getCadresPossedes(true);
    localStorage.removeItem('lastCadresUpdate');
  }

  await afficherCadres();
});
