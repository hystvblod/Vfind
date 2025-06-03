import { getJetons, addJetons, removeJeton, getCadreSelectionne, updateUserData, getUserDataCloud, getDefisFromSupabase, isPremium } from "./userData.js";
import { ouvrirCameraPour as cameraOuvrirCameraPour } from "./camera.js";

// Variables globales
let userData = null;
let allDefis = [];
let defiIndexActuel = null;
let canRetakePhoto = false;
let retakeDefiId = null;

const DEFIS_CACHE_KEY = "vfind_defis_cache";
const DEFIS_CACHE_DATE_KEY = "vfind_defis_cache_date";
const DEFIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// --------- CHARGEMENT DES DEFIS ---------
async function chargerDefis(lang = "fr") {
  const lastFetch = parseInt(localStorage.getItem(DEFIS_CACHE_DATE_KEY) || "0");
  if (Date.now() - lastFetch < DEFIS_CACHE_TTL) {
    const defisCache = localStorage.getItem(DEFIS_CACHE_KEY);
    if (defisCache) {
      allDefis = JSON.parse(defisCache);
      return allDefis;
    }
  }
  allDefis = await getDefisFromSupabase(lang);
  localStorage.setItem(DEFIS_CACHE_KEY, JSON.stringify(allDefis));
  localStorage.setItem(DEFIS_CACHE_DATE_KEY, Date.now().toString());
  return allDefis;
}

// ---------- GESTION UTILISATEUR ----------
async function chargerUserData(forceRefresh = false) {
  if (userData && !forceRefresh) return userData;
  userData = await getUserDataCloud();
  return userData;
}

// ----------- NETTOYAGE PHOTOS EXPIREES -------------
function nettoyerPhotosDefis() {
  const now = Date.now();
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("photo_defi_")) {
      const dateKey = key + "_date";
      const time = parseInt(localStorage.getItem(dateKey) || "0");
      if (time && now - time > DEFIS_CACHE_TTL) {
        const photosAimees = JSON.parse(localStorage.getItem("photos_aimees") || "[]");
        const photoId = key.replace("photo_defi_", "");
        if (!photosAimees.includes(photoId)) {
          localStorage.removeItem(key);
          localStorage.removeItem(dateKey);
        }
      }
    }
  });
}

// ----------- STOCKAGE PHOTO AIMEE -------------
function aimerPhoto(defiId) {
  let photosAimees = JSON.parse(localStorage.getItem("photos_aimees") || "[]");
  if (!photosAimees.includes(defiId)) {
    photosAimees.push(defiId);
    localStorage.setItem("photos_aimees", JSON.stringify(photosAimees));
  }
}
function retirerPhotoAimee(defiId) {
  let photosAimees = JSON.parse(localStorage.getItem("photos_aimees") || "[]");
  photosAimees = photosAimees.filter(id => id !== defiId);
  localStorage.setItem("photos_aimees", JSON.stringify(photosAimees));
}

// ----------- MAJ SOLDE POINTS/JETONS -------------
document.addEventListener("DOMContentLoaded", async () => {
  nettoyerPhotosDefis();
  await chargerUserData(true);
  majSolde();
  // ...détection langue, etc. (ton code)
  window.ouvrirCameraPour = (defiId) => cameraOuvrirCameraPour(defiId, "solo");
  await chargerDefis(userLang);
  init();

  // PATCH ULTRA DEEP : Attache le bouton après tout affichage
  const btnStart = document.getElementById("startBtn");
  if (btnStart) btnStart.onclick = startGame;
});


function majSolde() {
  if (document.getElementById("points")) document.getElementById("points").textContent = userData.points || 0;
  if (document.getElementById("jetons")) document.getElementById("jetons").textContent = userData.jetons || 0;
}

// ----------- LOGIQUE JEU -------------
async function init() {
  await chargerUserData(true);
  // Si partie en cours (timer OK et défis non tous faits)
  if (
    Array.isArray(userData.defiActifs) &&
    userData.defiActifs.length > 0 &&
    userData.defiTimer &&
    Date.now() < userData.defiTimer &&
    !tousDefisFaits(userData.defiActifs)
  ) {
    showGame();
    updateTimer();
    await loadDefis();
    return;
  }

  // Si partie FINIE (timer fini OU tous les défis faits)
  if (
    (Array.isArray(userData.defiActifs) && userData.defiActifs.length > 0 && userData.defiTimer && Date.now() >= userData.defiTimer) ||
    tousDefisFaits(userData.defiActifs)
  ) {
    // Fin automatique
    await endGameAuto();
    return;
  }

  // Sinon : partie à lancer
  showStart();
}

function tousDefisFaits(defis) {
  if (!defis || !defis.length) return false;
  return defis.every(d => d.done);
}

// Nettoie les photos solo AVANT nouvelle partie
function nettoyerPhotosDefisPartie() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("photo_defi_")) {
      localStorage.removeItem(key);
      localStorage.removeItem(key + "_date");
    }
  });
}

async function startGame() {
  await chargerUserData(true);
  if (
    Array.isArray(userData.defiActifs) &&
    userData.defiActifs.length > 0 &&
    userData.defiTimer &&
    Date.now() < userData.defiTimer &&
    !tousDefisFaits(userData.defiActifs)
  ) {
    showGame();
    return;
  }
  nettoyerPhotosDefisPartie();
  const newDefis = getRandomDefis(3);
  const endTime = Date.now() + 24 * 60 * 60 * 1000;
  await updateUserData({ defiActifs: newDefis, defiTimer: endTime });
  await chargerUserData(true);
  showGame();
  updateTimer();
  await loadDefis();
}

function getRandomDefis(n) {
  const shuffled = [...allDefis].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n).map(defi => ({ ...defi, done: false, byJeton: false, canRetake: true }));
}

function showGame() {
  document.getElementById("pre-game").classList.add("hidden");
  document.getElementById("end-section").classList.add("hidden");
  document.getElementById("game-section").classList.remove("hidden");
  const soldeContainer = document.getElementById("solde-container");
  if (soldeContainer) soldeContainer.style.display = "flex";
}

function showStart() {
  document.getElementById("pre-game").classList.remove("hidden");
  document.getElementById("game-section").classList.add("hidden");
  document.getElementById("end-section").classList.add("hidden");
  const soldeContainer = document.getElementById("solde-container");
  if (soldeContainer) soldeContainer.style.display = "none";
}

function updateTimer() {
  const timerDisplay = document.getElementById("timer");
  const interval = setInterval(async () => {
    await chargerUserData();
    const endTime = userData.defiTimer;
    if (!endTime) return;
    const now = Date.now();
    const diff = endTime - now;
    if (diff <= 0) {
      clearInterval(interval);
      await endGameAuto();
      return;
    }
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    timerDisplay.textContent = `${h}h ${m}m ${s}s`;
  }, 1000);
}

// ----------- CHARGEMENT DES DÉFIS À AFFICHER -----------
async function loadDefis() {
  await chargerUserData();
  let defis = userData.defiActifs || [];
  const defiList = document.getElementById("defi-list");
  if (!defis || !Array.isArray(defis) || defis.length === 0) {
    defiList.innerHTML = '<li class="defi-vide">Aucun défi à afficher. Clique sur "Lancer une partie".</li>';
    return;
  }
  defiList.innerHTML = '';
  let photosMap = {};
  for (let index = 0; index < defis.length; index++) {
    const defi = defis[index];
    const li = document.createElement("li");
    li.className = "defi-item";
    if (defi.done) li.classList.add("done");
    li.setAttribute("data-defi-id", defi.id);

    let dataUrl = localStorage.getItem(`photo_defi_${defi.id}`);
    photosMap[defi.id] = dataUrl || null;

    const hasPhoto = !!dataUrl;
    const boutonPhoto = `
      <img
        src="assets/icons/photo.svg"
        alt="Prendre une photo"
        style="width:2.2em;cursor:pointer;display:block;margin:0 auto;"
        onclick="window.ouvrirCameraPour('${defi.id}')"
      >
    `;

    let jetonHtml = '';
    if (!hasPhoto && !defi.done) {
      jetonHtml = `<img src="assets/img/jeton_p.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />`;
    }

    let retakeBtn = '';
    if (hasPhoto && !defi.done && !isPremium()) {
      retakeBtn = `<button class="btn-retake-photo" onclick="window.askRetakePhoto('${defi.id}')">♻️ Reprendre photo</button>`;
    }

    li.innerHTML = `
      <div class="defi-content">
        <div class="defi-texte">
          <p>${defi.texte}</p>
          ${boutonPhoto}
          ${retakeBtn}
        </div>
        <div class="defi-photo-container" data-photo-id="${defi.id}"></div>
      </div>
      ${jetonHtml}
    `;

    defiList.appendChild(li);
  }
  await afficherPhotosSauvegardees(photosMap);
}

// ----------- GESTION PHOTO & REPRISE PREMIUM/REWARD -----------
window.askRetakePhoto = function(defiId) {
  // Si premium, on autorise direct
  if (isPremium()) {
    canRetakePhoto = true;
    retakeDefiId = defiId;
    window.ouvrirCameraPour(defiId);
    return;
  }
  // Si pas premium : pop up choix
  if (confirm("Cette fonctionnalité est réservée aux premium ou après avoir regardé une pub. Voulez-vous regarder une pub pour reprendre la photo ?")) {
    canRetakePhoto = true;
    retakeDefiId = defiId;
    window.ouvrirCameraPour(defiId);
    // Le bouton Valider (ci-dessous) devra obliger à regarder la pub AVANT d'enregistrer la nouvelle photo.
  }
};

window.afficherPhotoDansCadreSolo = async function(defiId, dataUrl) {
  // Si demande de reprise (pub requise), alors la photo n'est enregistrée QUE quand la pub est vue (voir bouton Valider)
  if (canRetakePhoto && retakeDefiId === defiId && !isPremium()) {
    // On bloque la sauvegarde, propose de valider après reward
    window.waitingPhotoToSave = { defiId, dataUrl };
    alert("Pour valider cette nouvelle photo, regarde d'abord la publicité !");
    // Cacher le bouton valider tant que pas de pub vue (à adapter si tu veux)
    showRewardedAd().then(async () => {
      // On sauvegarde la photo maintenant !
      localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
      localStorage.setItem(`photo_defi_${defiId}_date`, Date.now().toString());
      canRetakePhoto = false;
      retakeDefiId = null;
      await loadDefis();
    });
    return;
  }
  // Cas normal (photo prise)
  localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
  localStorage.setItem(`photo_defi_${defiId}_date`, Date.now().toString());
  canRetakePhoto = false;
  retakeDefiId = null;
  await loadDefis();
};

async function afficherPhotosSauvegardees(photosMap) {
  const cadreActuel = await getCadreSelectionne();
  document.querySelectorAll(".defi-item").forEach(defiEl => {
    const id = defiEl.getAttribute("data-defi-id");
    const dataUrl = photosMap[id];
    if (dataUrl) {
      const containerCadre = document.createElement("div");
      containerCadre.className = "cadre-item cadre-duel-mini";
      const preview = document.createElement("div");
      preview.className = "cadre-preview";
      const fond = document.createElement("img");
      fond.className = "photo-cadre";
      fond.src = `./assets/cadres/${cadreActuel}.webp`;
      const photo = document.createElement("img");
      photo.className = "photo-user";
      photo.src = dataUrl;
      photo.onclick = () => agrandirPhoto(dataUrl, id);
      preview.appendChild(fond);
      preview.appendChild(photo);
      containerCadre.appendChild(preview);
      const container = defiEl.querySelector(`[data-photo-id="${id}"]`);
      if (container) {
        container.innerHTML = '';
        container.appendChild(containerCadre);
        defiEl.classList.add("done");
      }
    }
  });
}

// ----------- VALIDATION DÉFI AVEC JETON OU PHOTO -----------
window.validerDefi = async function(index) {
  await chargerUserData();
  let defis = userData.defiActifs || [];
  let defi = defis[index];
  if (!defi.done) {
    // S'il y a une photo : validé normalement
    if (localStorage.getItem(`photo_defi_${defi.id}`)) {
      defi.done = true;
      await updateUserData({ defiActifs: defis });
      await chargerUserData(true);
      await loadDefis();
      // Vérifie si tous les défis sont faits, popup fin auto
      if (tousDefisFaits(defis)) await endGameAuto();
      return;
    }
    // Sinon, essaye de valider avec un jeton
    await window.ouvrirPopupJeton(index);
  }
};

window.ouvrirPopupJeton = async function(index) {
  const jetons = await getJetons();
  if (jetons > 0) {
    if (confirm("Valider ce défi avec un jeton ?")) {
      const success = await removeJeton();
      if (success) {
        await validerDefiAvecJeton(index);
        majSolde();
      } else {
        alert("Erreur lors de la soustraction du jeton.");
      }
    }
  } else {
    // Pas de jeton : popup Reward pour en gagner 3
    if (confirm("Plus de jeton disponible. Regarder une pub pour gagner 3 jetons ?")) {
      await showRewardedAd();
      await addJetons(3);
      majSolde();
      alert("3 jetons crédités !");
    }
  }
};

async function validerDefiAvecJeton(index) {
  await chargerUserData();
  let defis = userData.defiActifs || [];
  let defi = defis[index];
  if (!defi.done) {
    defi.done = true;
    defi.byJeton = true;
    // On met la photo “jetonpp.webp” à la place de la photo user
    localStorage.setItem(`photo_defi_${defi.id}`, "assets/img/jetonpp.webp");
    await updateUserData({ defiActifs: defis });
    await chargerUserData(true);
    await loadDefis();
    if (tousDefisFaits(defis)) await endGameAuto();
  }
}

// ----------- FIN DE PARTIE AUTOMATIQUE -----------
async function endGameAuto() {
  await chargerUserData();
  let defis = userData.defiActifs || [];
  if (!defis.length) return;
  let nbFaits = defis.filter(d => d.done).length;
  let gain = nbFaits * 10;
  if (nbFaits === 3) gain += 10;
  const oldPoints = userData.points || 0;
  const newPoints = oldPoints + gain;
  const date = new Date().toISOString().slice(0, 10);
  let historique = userData.historique || [];
  historique.push({ date, defi: defis.map(d => d.id) });
  await updateUserData({ points: newPoints, defiActifs: [], defiTimer: 0, historique });
  await chargerUserData(true);

  // Popup fin de partie
  document.getElementById("end-message").textContent =
    `Partie terminée ! Tu as validé ${nbFaits}/3 défis.`;
  document.getElementById("gain-message").textContent =
    `+${gain} pièces (${nbFaits} défi${nbFaits>1?"s":""} x10${nbFaits===3?" +10 bonus":""})`;

  document.getElementById("popup-end").classList.remove("hidden");
  document.getElementById("popup-end").classList.add("show");
  majSolde();
  document.getElementById("replayBtnEnd").onclick = async function() {
    document.getElementById("popup-end").classList.add("hidden");
    document.getElementById("popup-end").classList.remove("show");
    await startGame();
  };
  document.getElementById("returnBtnEnd").onclick = function() {
    window.location.href = "index.html";
  };
}

// === Ajout : fermeture croix popup + nettoyage du bouton cœur ===
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.close-btn, #close-popup').forEach(btn => {
    btn.onclick = function() {
      let popup = btn.closest('.popup');
      if (popup) {
        popup.classList.add('hidden');
        popup.classList.remove('show');
      }
      let btnAimer = document.getElementById("btn-aimer-photo");
      if (btnAimer) btnAimer.remove();
    };
  });
});

// ----------- EXEMPLE : fonction reward à compléter selon ta régie pub -----------
async function showRewardedAd() {
  return new Promise((resolve) => {
    // TODO : remplacer par ton système de pub réel
    alert("SIMULATION PUB : regarde ta vidéo ici…");
    setTimeout(() => { resolve(); }, 3200);
  });
}
