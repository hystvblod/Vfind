import { db, auth } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";
import { ouvrirCameraPour } from "./camera.js";

// Utilitaire : concoursId de la semaine (ex : "22-2025")
function getConcoursId() {
  const now = new Date();
  const year = now.getFullYear();
  const firstJan = new Date(year, 0, 1);
  const days = Math.floor((now - firstJan) / 86400000);
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${week}-${year}`;
}

// -- VOTES ET SESSION
let votesToday = 0;
let maxVotes = 0;
let dejaVotees = [];

document.addEventListener("DOMContentLoaded", async () => {
  await majVotesRestants();

  const participerBtn = document.getElementById("participerBtn");
  if (participerBtn) {
    participerBtn.addEventListener("click", async () => {
      // Prends la photo et récupère le base64
      const base64 = await ouvrirCameraPour("concours", "base64");
      if (base64 && typeof base64 === "string" && base64.trim().length > 5) {
        await ajouterPhotoConcours(base64);
        afficherGalerieConcours();
      } else {
        alert("Erreur lors de la capture de la photo !");
      }
    });
  }

  afficherGalerieConcours();
});

// Ajoute la photo dans la bonne sous-collection Firestore
export async function ajouterPhotoConcours(base64Image) {
  if (!base64Image || typeof base64Image !== "string" || base64Image.trim().length < 5) return;

  const concoursId = getConcoursId();
  const user = auth.currentUser;
  const userName = user.displayName || user.email || user.uid;

  try {
    const photosRef = collection(db, "concours", concoursId, "photos");
    await addDoc(photosRef, {
      photoBase64: base64Image,
      user: userName,
      votesTotal: 0
    });
  } catch (e) {
    alert("Erreur lors de l'ajout de la photo au concours.");
    console.error(e);
  }
}

// Récupère toutes les photos du concours courant (TOP 9 + autres)
export async function getPhotosConcours() {
  const concoursId = getConcoursId();
  const photosRef = collection(db, "concours", concoursId, "photos");
  try {
    const snap = await getDocs(photosRef);
    let photos = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      photos.push({
        id: docSnap.id,
        url: d.url || d.photoBase64, // Fallback pour migration future
        user: d.user || "Inconnu",
        votesTotal: d.votesTotal || 0
      });
    });
    // Tri décroissant sur les votes
    photos.sort((a, b) => b.votesTotal - a.votesTotal);
    return photos;
  } catch (e) {
    console.error("Erreur lors de la récupération des photos concours :", e);
    return [];
  }
}

// -- AFFICHAGE, VOTE, POPUP

async function majVotesRestants() {
  votesToday = 3;
  maxVotes = 3;
  dejaVotees = JSON.parse(localStorage.getItem("votesConcours-" + getConcoursId()) || "[]");

  let affichage = `${votesToday}/${maxVotes} votes restants aujourd'hui`;
  let compteur = document.getElementById("votes-restants");
  if (!compteur) {
    compteur = document.createElement("div");
    compteur.id = "votes-restants";
    compteur.style = "text-align:center;margin-top:10px;margin-bottom:10px;font-weight:bold;font-size:1.07em;color:#ffe04a;";
    document.querySelector("main").insertBefore(compteur, document.querySelector("main").children[1]);
  }
  compteur.textContent = affichage;
}

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

    if (top.length > 0) {
      const titreTop = document.createElement("div");
      titreTop.textContent = "🏆 TOP 9";
      titreTop.style = "text-align:left;margin-bottom:6px;font-weight:bold;font-size:1.08em;color:#ffe04a;";
      galerie.appendChild(titreTop);

      const gridTop = document.createElement("div");
      gridTop.className = "galerie-concours";
      top.forEach(photo => {
        const card = creerCartePhoto(photo, true);
        if (card) gridTop.appendChild(card);
      });
      galerie.appendChild(gridTop);
    }

    if (autres.length > 0) {
      const titreAutres = document.createElement("div");
      titreAutres.textContent = "Toutes les photos";
      titreAutres.style = "text-align:left;margin:16px 0 6px 0;font-weight:bold;font-size:1.06em;";
      galerie.appendChild(titreAutres);

      const gridAutres = document.createElement("div");
      gridAutres.className = "galerie-concours";
      autres.forEach(photo => {
        const card = creerCartePhoto(photo, false);
        if (card) gridAutres.appendChild(card);
      });
      galerie.appendChild(gridAutres);
    }
  } catch (e) {
    galerie.innerHTML = "<div style='text-align:center;color:#e44;'>Erreur lors du chargement.</div>";
    console.error(e);
  }
}

function creerCartePhoto(photo, isTop) {
  // Si pas d’URL/base64 : RIEN ne s’affiche
  if (!photo.url || typeof photo.url !== "string" || photo.url.trim().length < 5) {
    return null;
  }
  const div = document.createElement("div");
  div.className = "photo-concours-item";
  if (isTop) div.classList.add("top9-photo");

  div.innerHTML = `
    <div class="photo-concours-img-wrapper" style="position:relative;cursor:pointer;">
      <img src="${photo.url}" class="photo-concours-img" />
      <button class="btn-coeur-concours" style="position:absolute;right:7px;top:7px;background:rgba(30,30,30,0.87);border:none;border-radius:16px;padding:4px 10px;cursor:pointer;"
        ${dejaVotees.includes(photo.id) || votesToday === 0 ? "disabled" : ""}>
        <img src="assets/icons/coeur.svg" alt="Vote" style="width:22px;height:22px;vertical-align:middle;opacity:${dejaVotees.includes(photo.id) ? '0.43':'1'};">
        <span class="nbvotes" style="margin-left:5px;color:#ffe04a;font-weight:bold;">${photo.votesTotal}</span>
      </button>
    </div>
    <div class="photo-concours-user">${photo.user || "?"}</div>
  `;

  // Gestion vote direct sur bouton cœur
  const btn = div.querySelector(".btn-coeur-concours");
  if (!dejaVotees.includes(photo.id) && votesToday > 0) {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      btn.querySelector("img").style.opacity = "0.43";
      try {
        // Update votesTotal dans Firestore
        await updateDoc(doc(db, "concours", getConcoursId(), "photos", photo.id), {
          votesTotal: (photo.votesTotal || 0) + 1
        });
        // Mets à jour localStorage
        dejaVotees.push(photo.id);
        localStorage.setItem("votesConcours-" + getConcoursId(), JSON.stringify(dejaVotees));
        btn.querySelector(".nbvotes").textContent = Number(btn.querySelector(".nbvotes").textContent) + 1;
        votesToday--;
        await majVotesRestants();
      } catch (e) {
        alert("Erreur lors du vote.");
        console.error(e);
      }
    });
  }

  div.querySelector(".photo-concours-img-wrapper").addEventListener("click", () => {
    ouvrirPopupZoom(photo);
  });

  return div;
}

// POPUP ZOOM PHOTO
function ouvrirPopupZoom(photo) {
  if (!photo.url || typeof photo.url !== "string" || photo.url.trim().length < 5) return; // rien si photo absente

  let old = document.getElementById("popup-photo-zoom");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.id = "popup-photo-zoom";
  popup.className = "popup show";
  popup.style = "z-index:10002;background:rgba(30,30,40,0.82);";
  popup.innerHTML = `
    <div class="popup-inner" style="max-width:350px;margin:auto;background:#181829;border-radius:24px;padding:22px 16px;position:relative;">
      <button id="close-popup-zoom" class="close-btn" style="position:absolute;top:10px;right:14px;font-size:1.4em;">✖</button>
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="cadre-preview cadre-popup" style="margin-bottom:18px;">
          <img class="photo-cadre" src="assets/cadres/polaroid_01.webp" />
          <img class="photo-user" src="${photo.url}" style="max-width:230px;max-height:230px;" />
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="color:#ffe04a;font-weight:bold;font-size:1.1em;letter-spacing:1px;">${photo.user || "?"}</span>
          <span style="color:#bbb;font-size:0.92em;">ID: ${photo.id}</span>
        </div>
        <div style="margin-top:20px;display:flex;justify-content:center;width:100%;">
          <button class="btn-coeur-popup"
            style="display:flex;align-items:center;gap:10px;font-size:1.2em;background:rgba(255,224,74,0.15);border:none;border-radius:18px;padding:10px 28px;cursor:pointer;color:#ffe04a;font-weight:bold;"
            ${dejaVotees.includes(photo.id) || votesToday === 0 ? "disabled" : ""}>
            <img src="assets/icons/coeur.svg" alt="Vote" style="width:29px;height:29px;vertical-align:middle;opacity:${dejaVotees.includes(photo.id) ? '0.43':'1'};">
            <span class="nbvotes">${photo.votesTotal}</span>
            <span style="font-size:1em;margin-left:8px;">Voter</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  popup.querySelector("#close-popup-zoom").onclick = () => popup.remove();

  const btnVote = popup.querySelector(".btn-coeur-popup");
  if (!dejaVotees.includes(photo.id) && votesToday > 0) {
    btnVote.addEventListener("click", async () => {
      btnVote.disabled = true;
      btnVote.querySelector("img").style.opacity = "0.43";
      try {
        await updateDoc(doc(db, "concours", getConcoursId(), "photos", photo.id), {
          votesTotal: (photo.votesTotal || 0) + 1
        });
        dejaVotees.push(photo.id);
        localStorage.setItem("votesConcours-" + getConcoursId(), JSON.stringify(dejaVotees));
        btnVote.querySelector(".nbvotes").textContent = Number(btnVote.querySelector(".nbvotes").textContent) + 1;
        votesToday--;
        await majVotesRestants();
        setTimeout(afficherGalerieConcours, 400);
      } catch (e) {
        alert("Erreur lors du vote.");
        console.error(e);
      }
    });
  }
}
