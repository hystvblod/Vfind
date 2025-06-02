import { getJetons, removeJeton, getCadreSelectionne, updateUserData, getUserDataCloud, getDefisFromSupabase } from "./userData.js";
import { ouvrirCameraPour as cameraOuvrirCameraPour } from "./camera.js";

let userData = null;
let allDefis = [];
let defiIndexActuel = null;

const DEFIS_CACHE_KEY = "vfind_defis_cache";
const DEFIS_CACHE_DATE_KEY = "vfind_defis_cache_date";
const DEFIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// --------- CHARGEMENT DES DEFIS : SUPABASE puis CACHE LOCAL ---------
async function chargerDefis(lang = "fr") {
  // Si cache < 24h : charge local
  const lastFetch = parseInt(localStorage.getItem(DEFIS_CACHE_DATE_KEY) || "0");
  if (Date.now() - lastFetch < DEFIS_CACHE_TTL) {
    const defisCache = localStorage.getItem(DEFIS_CACHE_KEY);
    if (defisCache) {
      allDefis = JSON.parse(defisCache);
      return allDefis;
    }
  }
  // Sinon, va sur Supabase via userData.js (pro)
  allDefis = await getDefisFromSupabase(lang);
  localStorage.setItem(DEFIS_CACHE_KEY, JSON.stringify(allDefis));
  localStorage.setItem(DEFIS_CACHE_DATE_KEY, Date.now().toString());
  return allDefis;
}

// ---------- GESTION DU PROFIL UTILISATEUR ----------
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
      // Chaque photo a une date : localStorage["photo_defi_X_date"]
      const dateKey = key + "_date";
      const time = parseInt(localStorage.getItem(dateKey) || "0");
      if (time && now - time > DEFIS_CACHE_TTL) {
        // Vérifie si la photo est aimée
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
  if (document.getElementById("points")) document.getElementById("points").textContent = userData.points || 0;
  if (document.getElementById("jetons")) document.getElementById("jetons").textContent = userData.jetons || 0;
});

// ----------- LOGIQUE JEU -------------
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const replayBtn = document.getElementById("replayBtn");
  const preGame = document.getElementById("pre-game");
  const gameSection = document.getElementById("game-section");
  const endSection = document.getElementById("end-section");
  const timerDisplay = document.getElementById("timer");
  const defiList = document.getElementById("defi-list");

  let userLang = navigator.language || navigator.userLanguage;
  userLang = userLang.split("-")[0];
  const supportedLangs = ["fr", "en", "es", "de", "it", "nl", "pt", "ar", "ja", "ko"];
  const savedLang = localStorage.getItem("langue");
  if (savedLang && supportedLangs.includes(savedLang)) userLang = savedLang;
  if (!supportedLangs.includes(userLang)) userLang = "fr";

  window.ouvrirCameraPour = (defiId) => cameraOuvrirCameraPour(defiId, "solo");

  chargerDefis(userLang).then(() => {
    init();
  });

  async function init() {
    startBtn?.addEventListener("click", startGame);
    replayBtn?.addEventListener("click", showStart);

    await chargerUserData(true);
    if (!userData.defiActifs || !Array.isArray(userData.defiActifs) || userData.defiActifs.length === 0) {
      showStart();
    } else if (userData.defiTimer && Date.now() < userData.defiTimer) {
      showGame();
    } else {
      showStart();
    }
  }

  async function startGame() {
    const newDefis = getRandomDefis(3);
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    await updateUserData({ defiActifs: newDefis, defiTimer: endTime });
    await chargerUserData(true);
    showGame();
  }

  function getRandomDefis(n) {
    const shuffled = [...allDefis].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n).map(defi => ({ ...defi, done: false }));
  }

  function showGame() {
    preGame.classList.add("hidden");
    endSection.classList.add("hidden");
    gameSection.classList.remove("hidden");
    updateTimer();
    loadDefis();
  }

  function showStart() {
    preGame.classList.remove("hidden");
    gameSection.classList.add("hidden");
    endSection.classList.add("hidden");
  }

  function updateTimer() {
    const interval = setInterval(async () => {
      await chargerUserData();
      const endTime = userData.defiTimer;
      if (!endTime) return;
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        await window.endGameAuto();
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      timerDisplay.textContent = `${h}h ${m}m ${s}s`;
    }, 1000);
  }

  async function loadDefis() {
    await chargerUserData();
    let defis = userData.defiActifs || [];
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

      li.innerHTML = `
        <div class="defi-content">
          <div class="defi-texte">
            <p>${defi.texte}</p>
            ${boutonPhoto}
        <img
          src="assets/icons/coeur.svg"
          alt="Ajouter aux photos aimées"
          style="width:2em;cursor:pointer;display:inline-block;margin-left:0.6em;vertical-align:middle;"
          onclick="window.aimerPhoto('${defi.id}')"
        >
          </div>
          <div class="defi-photo-container" data-photo-id="${defi.id}"></div>
        </div>
        ${!hasPhoto ? `<img src="assets/img/jeton_p.webp" alt="Jeton" class="jeton-icone" onclick="ouvrirPopupJeton(${index})" />` : ''}
      `;

      defiList.appendChild(li);
    }
    await afficherPhotosSauvegardees(photosMap);
  }

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

  async function agrandirPhoto(dataUrl, id) {
    const cadreActuel = await getCadreSelectionne();
    document.getElementById("photo-affichee").src = dataUrl;
    document.getElementById("cadre-affiche").src = `./assets/cadres/${cadreActuel}.webp`;

    const popup = document.getElementById("popup-photo");
    popup.classList.remove("hidden");
    popup.classList.add("show");
  }

  window.validerDefi = async function(index) {
    await chargerUserData();
    let defis = userData.defiActifs || [];
    if (!defis[index].done) {
      defis[index].done = true;
      await updateUserData({ defiActifs: defis });
      await chargerUserData(true);
      await loadDefis();
    }
  };

  window.ouvrirPopupJeton = async function(index) {
    const jetons = await getJetons();
    document.getElementById("solde-jeton").textContent = `Jetons disponibles : ${jetons}`;
    document.getElementById("popup-jeton").classList.remove("hidden");
    document.getElementById("popup-jeton").classList.add("show");
    defiIndexActuel = index;

    document.getElementById("valider-jeton-btn").onclick = async () => {
      const jetons = await getJetons();
      if (jetons > 0) {
        const success = await removeJeton();
        if (success) {
          if (typeof validerDefi === "function") {
            validerDefi(defiIndexActuel);
          }
          fermerPopupJeton();
        } else {
          alert("❌ Erreur lors de la soustraction du jeton.");
        }
      } else {
        alert("❌ Pas de jeton disponible.");
      }
    };
  };

  window.fermerPopupJeton = function () {
    document.getElementById("popup-jeton").classList.remove("show");
    document.getElementById("popup-jeton").classList.add("hidden");
  };

  window.afficherPhotoDansCadreSolo = async function(defiId, dataUrl) {
    if (!defiId || !dataUrl) return;
    localStorage.setItem(`photo_defi_${defiId}`, dataUrl);
    localStorage.setItem(`photo_defi_${defiId}_date`, Date.now().toString());
    await loadDefis();
  };

  window.aimerPhoto = function(defiId) {
    aimerPhoto(defiId);
    alert("Photo ajoutée à tes photos aimées !");
  };

  window.retirerPhotoAimee = function(defiId) {
    retirerPhotoAimee(defiId);
    alert("Photo retirée de tes photos aimées.");
  };

  document.addEventListener("photoAjouteeSolo", async () => {
    if (typeof loadDefis === "function") {
      await loadDefis();
    } else {
      window.location.reload();
    }
  });

  // ----------- PATCH FIN DE PARTIE PRO -----------
  window.endGame = async function() {
    await chargerUserData();
    let defis = userData.defiActifs || [];
    let nbPhotos = 0;
    defis.forEach(defi => {
      const photoUrl = localStorage.getItem(`photo_defi_${defi.id}`);
      if (photoUrl) nbPhotos++;
    });
    let gain = nbPhotos * 10;
    if (nbPhotos === 3) gain = 40; // Bonus si 3 photos prises

    const oldPoints = userData.points || 0;
    const newPoints = oldPoints + gain;

    // Ajoute à l'historique pour le calendrier
    const date = new Date().toISOString().slice(0, 10);
    let historique = userData.historique || [];
    historique.push({ date, defi: defis.map(d => d.id) });

    await updateUserData({ points: newPoints, defiActifs: [], defiTimer: 0, historique });
    await chargerUserData(true);

    document.getElementById("gain-message").textContent =
      `+${gain} pièces (10/photo${nbPhotos === 3 ? " + 10 bonus" : ""})`;

    document.getElementById("popup-end").classList.remove("hidden");
    document.getElementById("popup-end").classList.add("show");

    if (document.getElementById("points")) document.getElementById("points").textContent = newPoints;
  };

  // Fin automatique après timer (24h écoulées)
  window.endGameAuto = async function() {
    await chargerUserData();
    let defis = userData.defiActifs || [];
    if (!defis.length) return;

    // Ajout à l'historique pour le calendrier
    const date = new Date().toISOString().slice(0, 10);
    let historique = userData.historique || [];
    historique.push({ date, defi: defis.map(d => d.id) });
    await updateUserData({
      historique,
      defiActifs: [],
      defiTimer: 0
    });

    document.getElementById("end-message").textContent = "Temps écoulé, partie terminée !";
    document.getElementById("gain-message").textContent = "+0 pièce (temps écoulé)";
    document.getElementById("popup-end").classList.remove("hidden");
    document.getElementById("popup-end").classList.add("show");
    if (document.getElementById("points")) document.getElementById("points").textContent = userData.points || 0;
  };
  // ----------- FIN PATCH PRO -----------

  document.getElementById("replayBtnEnd").onclick = async function() {
    document.getElementById("popup-end").classList.add("hidden");
    document.getElementById("popup-end").classList.remove("show");
    await startGame();
  };

  document.getElementById("returnBtnEnd").onclick = function() {
    if (confirm("Quitter la partie ? Tu devras recommencer une nouvelle partie la prochaine fois.")) {
      window.location.href = "index.html";
    }
  };
});

// === Ajout : fermeture croix popup ===
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.close-btn, #close-popup').forEach(btn => {
    btn.onclick = function() {
      let popup = btn.closest('.popup');
      if (popup) {
        popup.classList.add('hidden');
        popup.classList.remove('show');
      }
    };
  });
});
