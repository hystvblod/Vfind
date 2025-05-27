// js/concours.js

import { ouvrirCameraPour } from "./camera.js";
import {
  getPhotosConcours,
  getVotesInfoForConcours,
  voterPourPhoto,
  getPseudo
} from "./userData.js";

let votesToday = 0;
let maxVotes = 0;
let dejaVotees = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Affichage du nombre de votes restants
  await majVotesRestants();

  // Bouton Participer (photo concours)
  const participerBtn = document.getElementById("participerBtn");
  if (participerBtn) {
    participerBtn.addEventListener("click", () => {
      ouvrirCameraPour("concours");
    });
  }

  // Chargement initial galerie
  afficherGalerieConcours();
});

// Met à jour l'affichage des votes restants dans le header
async function majVotesRestants() {
  try {
    const info = await getVotesInfoForConcours();
    votesToday = info.votesToday;
    maxVotes = info.maxVotes;
    dejaVotees = info.dejaVotees;

    let affichage = `${votesToday}/${maxVotes} vote${maxVotes > 1 ? "s" : ""} restants aujourd'hui`;
    // Ajoute l'affichage en haut de la page (ou adapte ici pour ton UI)
    let compteur = document.getElementById("votes-restants");
    if (!compteur) {
      compteur = document.createElement("div");
      compteur.id = "votes-restants";
      compteur.style = "text-align:center;margin-top:10px;margin-bottom:10px;font-weight:bold;font-size:1.07em;color:#ffe04a;";
      document.querySelector("main").insertBefore(compteur, document.querySelector("main").children[1]);
    }
    compteur.textContent = affichage;
  } catch (e) {
    console.error("Erreur votes restants :", e);
  }
}

// Affiche la galerie : TOP 9 puis toutes les autres
export async function afficherGalerieConcours() {
  const galerie = document.getElementById("galerie-concours");
  galerie.innerHTML = "<div style='text-align:center;color:#888;'>Chargement...</div>";
  try {
    const photos = await getPhotosConcours();
    if (!photos || photos.length === 0) {
      galerie.innerHTML = "<div style='text-align:center;color:#888;'>Aucune photo pour ce concours.</div>";
      return;
    }
    galerie.innerHTML = "";

    // Top 9
    const top = photos.slice(0, 9);
    const autres = photos.slice(9);

    // Section TOP 9
    if (top.length > 0) {
      const titreTop = document.createElement("div");
      titreTop.textContent = "🏆 TOP 9";
      titreTop.style = "text-align:left;margin-bottom:6px;font-weight:bold;font-size:1.08em;color:#ffe04a;";
      galerie.appendChild(titreTop);

      const gridTop = document.createElement("div");
      gridTop.className = "galerie-concours";
      top.forEach(photo => {
        gridTop.appendChild(creerCartePhoto(photo, true));
      });
      galerie.appendChild(gridTop);
    }

    // Section AUTRES
    if (autres.length > 0) {
      const titreAutres = document.createElement("div");
      titreAutres.textContent = "Toutes les photos";
      titreAutres.style = "text-align:left;margin:16px 0 6px 0;font-weight:bold;font-size:1.06em;";
      galerie.appendChild(titreAutres);

      const gridAutres = document.createElement("div");
      gridAutres.className = "galerie-concours";
      autres.forEach(photo => {
        gridAutres.appendChild(creerCartePhoto(photo, false));
      });
      galerie.appendChild(gridAutres);
    }
  } catch (e) {
    galerie.innerHTML = "<div style='text-align:center;color:#e44;'>Erreur lors du chargement.</div>";
    console.error(e);
  }
}

// Crée une carte photo (top ou non)
function creerCartePhoto(photo, isTop) {
  const div = document.createElement("div");
  div.className = "photo-concours-item";
  if (isTop) div.classList.add("top9-photo");

  div.innerHTML = `
    <img src="${photo.url}" class="photo-concours-img" />
    <div class="photo-concours-user">${photo.user || "?"}</div>
    <button class="btn-coeur-concours" style="position:absolute;right:6px;top:6px;background:rgba(30,30,30,0.88);border:none;border-radius:16px;padding:4px 10px;font-size:1.05em;cursor:pointer;color:${dejaVotees.includes(photo.id) ? "#bbb" : "#ffe04a"};" ${dejaVotees.includes(photo.id) || votesToday === 0 ? "disabled" : ""}>
      ❤️ <span class="nbvotes">${photo.votesTotal}</span>
    </button>
  `;

  // Gestion du vote
  const btn = div.querySelector(".btn-coeur-concours");
  if (!dejaVotees.includes(photo.id) && votesToday > 0) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.style.color = "#bbb";
      try {
        await voterPourPhoto(photo.id);
        // Update visuel immédiat
        btn.querySelector(".nbvotes").textContent = Number(btn.querySelector(".nbvotes").textContent) + 1;
        votesToday--;
        dejaVotees.push(photo.id);
        await majVotesRestants();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  return div;
}
